import AlgoliaSearch from 'algoliasearch';
import { fromIsoDateToElapsed } from '../util.js';
import { ALGOLIA_INDEX } from '../const.js';

const algoliaConf = {
  indexName: ALGOLIA_INDEX
}

let index;
let algoliaClient;
let settings = {
  hitsPerPage: 10,
  getRankingInfo: true
};

export function setAlgoliaCredentials(credentials) {
  algoliaClient = AlgoliaSearch(credentials.appId, credentials.searchKey);
  settings.filters = `user_id=${credentials.userid}`;
  index = algoliaClient.initIndex(algoliaConf.indexName);
  console.log("Updated Algolia credentials");
}


export function search(query) {
  return index.search(query, settings).then(content => {
    return content.hits.map(hit => {
      let users = [{
        name: hit.owner_display_name,
        nameHighlight: highlightedValue('owner_display_name', hit, true) !== '',
        type: 'Owner',
        avatar: hit.owner_photo_link
      }];
      if (hit.modifier_display_name && hit.modifier_display_name !== hit.owner_display_name) {
        users.push({
          name: hit.modifier_display_name,
          nameHighlight: highlightedValue('modifier_display_name', hit, true) !== '',
          type: 'Modifier',
          avatar: hit.modifier_photo_link
        });
      }
      
      let content = null;
      if (hit.content && hit.content.length > 0) {
        content = highlightedValue('content', hit).replace(/\n\s*\n/g, '\n\n').replace(/<em>/g, '<em class="algolia_highlight">');
      }

      let path = JSON.parse(highlightedValue('path', hit));
      if (path.length > 0) {
        const last = path.slice(-1)[0];
        let highlightedIndex = path.findIndex(x => x.indexOf('<em>') > -1);
        if (highlightedIndex < 0) {
          highlightedIndex = path.length - 1;
        }
        path = (highlightedIndex > 0 ? '…/' : '') + path[highlightedIndex] + (highlightedIndex < path.length - 1 ? '/…' : '');
      } else {
        path = '';
      }

      return {
        type: 'gdrive',
        title: highlightedValue('title', hit),
        content: content,
        metaInfo: {
          time: fromIsoDateToElapsed(hit.last_updated),
          users: users,
          path: path
        },
        displayIcon: hit.icon_link,
        webLink: hit.webview_link,
        thumbnailLink: hit.thumbnail_link,
        modified: hit.last_updated,
        _algolia: hit._rankingInfo
      }
    });
  }).catch(err => {
    console.log(err);
  });
}

function highlightedValue(attribute, hit, emptyIfNotHighlighted) {
  if(attribute in hit._highlightResult && hit._highlightResult[attribute].matchedWords.length > 0) {
    return hit._highlightResult[attribute].value;
  }
  return emptyIfNotHighlighted ? "" : hit[attribute];
}
