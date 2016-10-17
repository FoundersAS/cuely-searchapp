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
        name: hit.owner_displayName,
        nameHighlight: highlightedValue('owner_displayName', hit, true) !== '',
        type: 'Owner',
        avatar: hit.owner_photoLink
      }];
      if (hit.lastModifyingUser_displayName && hit.lastModifyingUser_displayName !== hit.owner_displayName) {
        users.push({
          name: hit.lastModifyingUser_displayName,
          nameHighlight: highlightedValue('lastModifyingUser_displayName', hit, true) !== '',
          type: 'Modifier',
          avatar: hit.lastModifyingUser_photoLink
        });
      }
      
      let content = null;
      if (hit.content && hit.content.length > 0) {
        content = highlightedValue('content', hit).replace(/\n\s*\n/g, '\n\n').replace(/<em>/g, '<em class="algolia_highlight">');
      }

      let path = JSON.parse(highlightedValue('path', hit));
      if (path.length > 0) {
        const last = path.slice(-1)[0];
        if (last.indexOf('<em>') > -1) {
          path = last;
        } else {
          path = path.join('/');
        }
        const maxLen = (path.indexOf('<em>') > -1) ? 35 : 25;
        if (path.length > maxLen) {
          path = path.substring(0, maxLen) + '…';
        }
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
        displayIcon: hit.iconLink,
        webLink: hit.webViewLink,
        thumbnailLink: hit.thumbnailLink,
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
