import AlgoliaSearch from 'algoliasearch';
import { fromIsoDateToElapsed } from '../util.js';

const algoliaConf = {
  appId: 'OPDWYH4IR4',
  searchKey: '0b28a5913167a1618773992171c04344',
  indexName: 'cuely_dev_documents'
}
const algoliaClient = AlgoliaSearch(algoliaConf.appId, algoliaConf.searchKey);
const index = algoliaClient.initIndex(algoliaConf.indexName);
const settings = {
  hitsPerPage: 10
};

export function search(query) {
  return index.search(query, settings).then(content => {
    return content.hits.map(hit => ({
      type: 'gdrive',
      title: hit.title,
      body: [
        'Last modified: ' + fromIsoDateToElapsed(hit.last_updated),
      ],
      infoUser: hit.owner_displayName,
      infoUserType: 'Owner',
      webLink: hit.webViewLink,
      modified: hit.last_updated
    }));
  });
}
