import AlgoliaSearch from 'algoliasearch';
import { cutStringWithTags, parseCsv } from '../util/util.js';
import { ALGOLIA_INDEX } from '../util/const.js';
import moment from 'moment';

const algoliaConf = {
  indexName: ALGOLIA_INDEX
}

let index;
let algoliaClient;
let settings = {
  hitsPerPage: 10,
  getRankingInfo: true
};
moment.locale('en-gb');

export function setAlgoliaCredentials(credentials) {
  algoliaClient = AlgoliaSearch(credentials.appId, credentials.searchKey);
  settings.filters = `user_id=${credentials.userid}`;
  index = algoliaClient.initIndex(algoliaConf.indexName);
  console.log("Updated Algolia credentials");
}

export function search(query) {
  return index.search(query, settings).then(content => {
    let hits = content.hits.map(hit => {
      // detect item type
      const keywords = hit.primary_keywords.toLowerCase();
      if (keywords.indexOf('gdrive') > -1) {
        return gdrive(hit);
      } else if (keywords.indexOf('intercom') > -1) {
        return intercom(hit);
      } else if (keywords.indexOf('pipedrive') > -1) {
        return pipedrive(hit);
      } else {
        return null;
      }
    }).filter(x => x);
    return {
      hits: hits,
      searchInfo: {
        time: Date(),
        query: query,
        settings: settings,
        result: content
      }
    };
  }).catch(err => {
    console.log(err);
  });
}

function pipedrive(hit) {
  let content = {
    company: highlightedValue('pipedrive_deal_company', hit),
    value: hit.pipedrive_deal_value,
    currency: hit.pipedrive_deal_currency,
  }
  const cleaned_content = cleanJsonContent(highlightedValue('pipedrive_content', hit), ['url', 'icon_url']);
  let contacts, users, activities = [];
  if (cleaned_content) {
    ({ contacts, users, activities } = cleaned_content);
    content.contacts = contacts;
    content.activities = activities.map(a => ({
      subject: a.subject,
      username: a.user_name,
      doneTime: moment(a.done_time).fromNow(),
      contact: a.contact,
      type: a.type
    }));

    users = users.map(user => ({
      avatar: user.icon_url,
      name: user.name.replace(/<em class="algolia_highlight">/g, '').replace(/<\/em>/g, ''),
      nameHighlight: user.name.indexOf('<em class="algolia_highlight">') > -1 ? user.name : null,
      email: user.email
    }));
  }

  return {
    type: 'pipedrive',
    mime: 'pipedrive',
    title: highlightedValue('pipedrive_title', hit),
    titleRaw: hit.pipedrive_title,
    content: content,
    metaInfo: {
      time: moment(hit.last_updated).fromNow(),
      status: hit.pipedrive_deal_status,
      stage: hit.pipedrive_deal_stage,
      users: users
    },
    displayIcon: hit.icon_link,
    webLink: hit.webview_link,
    thumbnailLink: null,
    modified: hit.last_updated,
    _algolia: hit._rankingInfo
  }
}

function intercom(hit) {
  let content = {
    company: highlightedValue('intercom_company', hit),
    monthlySpend: hit.intercom_monthly_spend || 0,
    plan: hit.intercom_plan || '',
    segments: hit.intercom_segments || '',
    sessions: hit.intercom_session_count || 0,
    conversationsCount: 0
  }
  const cleaned_content = cleanJsonContent(highlightedValue('intercom_content', hit), ['open', 'timestamp']);
  if (cleaned_content) {
    let { events, conversations } = cleanJsonContent(highlightedValue('intercom_content', hit), ['open', 'timestamp']);
    content.events = events.map(e => ({ name: e.name, time: moment(e.timestamp * 1000).fromNow() }));
    content.conversations = conversations.map(c => {
      return {
        subject: c.subject,
        open: c.open,
        items: c.items.filter(item => item.body).map(item => ({
          body: item.body,
          time: moment(item.timestamp * 1000).fromNow(),
          timestamp: item.timestamp,
          author: item.author,
          authorId: item.author_id
        }))
      };
    });
    content.conversations.sort((a, b) => {
      if (a.open === b.open) {
        return b.items.slice(-1)[0].timestamp - a.items.slice(-1)[0].timestamp;
      }
      return a.open ? -1 : 1;
    });
    content.conversationsCount = conversations.length;
  }

  return {
    type: 'intercom',
    mime: 'intercom',
    title: highlightedValue('intercom_title', hit),
    titleRaw: hit.intercom_title,
    userId: hit.intercom_user_id,
    content: content,
    metaInfo: {
      time: moment(hit.last_updated).fromNow(),
      open: content.conversationsCount > 0,
    },
    displayIcon: hit.icon_link,
    webLink: hit.webview_link,
    thumbnailLink: null,
    modified: hit.last_updated,
    _algolia: hit._rankingInfo
  }
}

function gdrive(hit) {
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
  if (['csv', 'tsv', 'comma', 'tab', 'google-apps.spreadsheet'].filter(x => hit.mime_type.indexOf(x) > -1).length > 0) {
    try {
      content = parseCsv(content);
    } catch (e) {
      console.log(`Could not parse: ${hit.title}`);
      console.log(e);
    }
  }

  let title = highlightedValue('title', hit);
  const isFolder = hit.secondary_keywords.indexOf('folders') > -1;
  if (isFolder) {
      let highlightedIndex = title.indexOf('<em>');
      if (highlightedIndex > 20 && title.length > 30) {
        title = '…' + title.substring(highlightedIndex - 20);
      }
  }
  let path = JSON.parse(highlightedValue('path', hit));
  if (path.length > 0) {
    let highlightedIndex = path.findIndex(x => x.indexOf('<em>') > -1);
    if (highlightedIndex < 0) {
      highlightedIndex = path.length - 1;
    }
    let folder = cutStringWithTags(path[highlightedIndex], 27, 'em', '…');
    path = (highlightedIndex > 0 ? '…/' : '') + folder + ((highlightedIndex < path.length - 1) ? '/…' : '');
  } else {
    path = '';
  }

  return {
    type: 'gdrive',
    mime: hit.mime_type,
    title: title,
    titleRaw: hit.title,
    content: content,
    metaInfo: {
      time: moment(hit.last_updated).fromNow(),
      users: users,
      path: path
    },
    displayIcon: hit.icon_link,
    webLink: hit.webview_link,
    thumbnailLink: hit.thumbnail_link,
    modified: hit.last_updated,
    _algolia: hit._rankingInfo
  }
}

function highlightedValue(attribute, hit, emptyIfNotHighlighted) {
  if(attribute in hit._highlightResult && hit._highlightResult[attribute].matchedWords.length > 0) {
    return hit._highlightResult[attribute].value;
  }
  return emptyIfNotHighlighted ? "" : hit[attribute];
}

function removeAlgoliaHighlight(json_text, json_keys) {
  let result = json_text;
  for (let json_key of json_keys) {
    const re = new RegExp(`"${json_key}":\\s*.*?,`, "g");
    const matches = (json_text.match(re) || []).filter(m => m.indexOf('<em>') > 0);
    for (let m of matches) {
      result = result.replace(m, m.replace(/<em>/g, '').replace(/<\/em>/g, ''));
    }
  }
  // also remove escaped '<em>' tags which can happen when Algolia highlights a letter in an escape sequence such as unicode character: \ud83d -> \<em>u</em>d83d
  // this is needed, because otherwise json parser will choke on it
  if (result.indexOf('\\<em>') > -1) {
    result = result.split('\\<em>').map(token => token.replace('</em>', '')).join('\\');
  }
  return result;
}

function cleanJsonContent(content_text, json_keys) {
  if (!content_text) {
    return null;
  }
  // in case of json formatted content, the parsed json object may contain highlighted (<em>...</em>) snippets
  // as atribute names, so we must remove those before using the json later on
  const content = removeAlgoliaHighlight(content_text, json_keys);
  // NOTE: do not change old style function to arrow function in next line, because it won't work ('this' has different scope in arrow functions)
  return JSON.parse(content, function(key, value) {
    const new_value = (typeof value  === 'string' || value instanceof String) ? value.replace(/<em>/g, '<em class="algolia_highlight">') : value;
    if (key.indexOf('<em>') > -1) {
      this[key.replace(/<em>/g, '').replace(/<\/em>/g, '')] = new_value;
      return;
    }
    return new_value;
  });
}
