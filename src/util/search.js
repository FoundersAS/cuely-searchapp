import opbeat from 'opbeat';
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
  hitsPerPage: 15,
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
  return searchInternal(query, settings);
}

export function searchAfter(query, timestamp) {
  // limit searching to those algolia records that have been created/updated after 'timestamp' parameter
  let timeSettings = Object.assign({}, settings);
  timeSettings.filters = timeSettings.filters + ` AND last_updated_ts > ${timestamp}`;
  return searchInternal(query, timeSettings);
}

export function searchInternal(query, search_settings) {
  return index.search(query, search_settings).then(content => {
    let hits = content.hits.map(hit => {
      // detect item type
      const keywords = hit.primary_keywords.toLowerCase();
      const secondayKeywords = (hit.secondary_keywords || '').toLowerCase();
      if (keywords.indexOf('gdrive') > -1) {
        return gdrive(hit);
      } else if (keywords.indexOf('intercom') > -1) {
        return intercom(hit);
      } else if (keywords.indexOf('pipedrive') > -1) {
        return pipedrive(hit);
      } else if (keywords.indexOf('helpscout') > -1) {
        if (hit.secondary_keywords.toLowerCase().indexOf('customer') > -1) {
          return helpscout(hit);
        } else {
          return helpscoutDocs(hit);
        }
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
    opbeat.captureError(err, {
      extra: {
        searchQuery: query,
        searchSettings: search_settings
      }
    });
  });
}

function helpscoutDocs(hit) {
  let content = highlightWithClass(highlightedValue('helpscout_document_content', hit));
  let users = hit.helpscout_document_users.map(user => ({
    avatar: user.avatar,
    name: user.name,
    nameHighlight: highlightedValueInArray('helpscout_document_users', 'name', user.name, hit, true)
  }));

  let statusLine = highlightedValue('helpscout_document_collection', hit);
  if (hit.helpscout_document_categories && hit.helpscout_document_categories.length > 0) {
    statusLine = statusLine + ': ' + highlightedArray('helpscout_document_categories', hit).join(', ');
    statusLine = cutStringWithTags(statusLine, 30, 'em', '…');
  }

  return {
    type: 'helpscout-docs',
    mime: 'helpscout',
    title: highlightedValue('helpscout_document_title', hit),
    titleRaw: hit.helpscout_document_title,
    content: content,
    metaInfo: {
      time: moment(hit.last_updated_ts * 1000).fromNow(),
      users: users,
      status: statusLine
    },
    displayIcon: hit.icon_link,
    webLink: hit.helpscout_document_public_link,
    thumbnailLink: null,
    modified: hit.last_updated,
    _algolia: hit._rankingInfo
  }  
}

function helpscout(hit) {
  let content = {
    company: highlightedValueWithClass('helpscout_company', hit),
    status: hit.helpscout_status || '',
    assigned: hit.helpscout_assigned,
    mailbox: highlightedValueWithClass('helpscout_mailbox', hit),
    mailboxId: hit.helpscout_mailbox_id,
    emails: highlightedValueWithClass('helpscout_emails', hit),
    name: highlightedValueWithClass('helpscout_name', hit)
  }
  const cleaned_content = cleanJsonContent(highlightedValue('helpscout_content', hit), ['url', 'avatar', 'is_customer', 'author_id', 'created', 'last_updated_ts', 'id'], hit.user_id);
  let users, conversations = [];
  if (cleaned_content) {
    ({ users, conversations } = cleaned_content);

    content.conversations = conversations.map(c => {
      return {
        id: c.id,
        number: c.number,
        mailbox: c.mailbox,
        assigned: c.owner ? 'Assigned' : 'Unassigned',
        subject: c.subject,
        status: c.status,
        items: c.threads.filter(item => item.body).map(item => ({
          body: item.body,
          time: moment(item.created * 1000).fromNow(),
          timestamp: item.created,
          author: item.author,
          authorId: item.author_id
        }))
      };
    });

    users = users.map(user => ({
      avatar: user.avatar,
      name: user.name.replace(/<em class="algolia_highlight">/g, '').replace(/<\/em>/g, ''),
      nameHighlight: user.name.indexOf('<em class="algolia_highlight">') > -1 ? user.name : null,
      email: user.email
    }));
  }

  return {
    type: 'helpscout',
    mime: 'helpscout',
    title: highlightedValue('helpscout_title', hit),
    titleRaw: hit.helpscout_title,
    userId: hit.helpscout_customer_id,
    content: content,
    metaInfo: {
      time: moment(hit.last_updated_ts * 1000).fromNow(),
      users: users,
      status: content.status,
      assigned: content.assigned ? 'Assigned' : 'Unassigned',
      mailbox: content.mailbox
    },
    displayIcon: hit.icon_link,
    webLink: hit.webview_link,
    thumbnailLink: null,
    modified: hit.last_updated,
    _algolia: hit._rankingInfo
  }  
}

function pipedrive(hit) {
  let content = {
    company: highlightedValueWithClass('pipedrive_deal_company', hit),
    value: hit.pipedrive_deal_value,
    currency: hit.pipedrive_deal_currency,
  }
  const cleaned_content = cleanJsonContent(highlightedValue('pipedrive_content', hit), ['url', 'icon_url', 'done_time'], hit.user_id);
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
      time: moment(hit.last_updated_ts * 1000).fromNow(),
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
    email: highlightedValueWithClass('intercom_email', hit),
    company: highlightedValueWithClass('intercom_company', hit),
    monthlySpend: hit.intercom_monthly_spend || 0,
    plan: hit.intercom_plan || '',
    segments: highlightedValueWithClass('intercom_segments', hit),
    newSegments: [],
    sessions: hit.intercom_session_count || 0,
    conversationsCount: 0
  }
  // new segments
  if (hit.intercom_segments && hit.intercom_segments.indexOf('::') > -1) {
    // convert 'Segment1::id1, Segment2::id2, ...' to [{name: 'Segment1', link: 'https://app.intercom.io/a/apps/jmoqapg5/users/segments/id1'}, ...]
    // a bit convoluted, because we need to take into account the random names people use for segments, including commas, semicolons, etc.
    let segments = []
    let tokens =  highlightedValue('intercom_segments', hit).split('::');
    let first = tokens.shift();
    for (let token of tokens) {
      let st = token.split(', ');
      segments.push([st[0], first]);
      first = st.splice(1).join(', ');
    }
    content.newSegments = segments.map(([sid, sname]) => {
      let [appId, segId] = sid.replace(/<em>/g, '').replace(/<\/em>/g, '').split('/');
      return {
        name: highlightWithClass(sname),
        link: `https://app.intercom.io/a/apps/${appId}/users/segments/${segId}`
      }
    });
  }

  const cleaned_content = cleanJsonContent(highlightedValue('intercom_content', hit), ['open', 'timestamp'], hit.user_id);
  if (cleaned_content) {
    let { events, conversations } = cleaned_content;
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
      time: moment(hit.last_updated_ts * 1000).fromNow(),
      open: content.conversationsCount > 0,
      users: []
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
    content = highlightWithClass(highlightedValue('content', hit).replace(/\n\s*\n/g, '\n\n'));
  }
  if (['csv', 'tsv', 'comma', 'tab', 'google-apps.spreadsheet'].filter(x => hit.mime_type.indexOf(x) > -1).length > 0) {
    try {
      content = parseCsv(content);
      // remove all empty rows (leave just first two)
      let first = false;
      let second = false;
      content = content.filter(x => {
        let skip = !(first && second);
        let row = x.filter(x => x);
        if (row.length > 0) {
          first = false;
          second = false;
        } else {
          second = first ? true : false;
          first = true;
        }
        return skip;
      });
    } catch (e) {
      console.log(`Could not parse: ${hit.title}`);
      console.log(e);
    }
  }

  let title = highlightedValue('title', hit);
  const isFolder = hit.secondary_keywords != null ? hit.secondary_keywords.indexOf('folders') > -1 : false;
  if (isFolder) {
      let highlightedIndex = title.indexOf('<em>');
      if (highlightedIndex > 20 && title.length > 30) {
        title = '…' + title.substring(highlightedIndex - 20);
      }
  }
  let path = JSON.parse(removeEscapedAlgoliaHighlight(highlightedValue('path', hit)));
  if (path.length > 0) {
    let highlightedIndex = path.findIndex(x => x.indexOf('<em>') > -1);
    if (highlightedIndex < 0) {
      highlightedIndex = path.length - 1;
    }
    path = cutStringWithTags(path[highlightedIndex], 27, 'em', '…');
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
      time: moment(hit.last_updated_ts * 1000).fromNow(),
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

function highlightedValue(attribute, hit, emptyIfNotHighlighted=false) {
  if(attribute in hit._highlightResult && hit._highlightResult[attribute].matchedWords.length > 0) {
    return hit._highlightResult[attribute].value;
  }
  return emptyIfNotHighlighted ? "" : hit[attribute];
}

// use for json arrays of strings
function highlightedArray(attribute, hit, emptyIfNotHighlighted=false) {
  if(attribute in hit._highlightResult) {
    const hits = hit._highlightResult[attribute].filter(x => x.matchedWords.length > 0);
    if (hits.length > 0) {
      return hit._highlightResult[attribute].map(x => x.value);
    }
  }
  return emptyIfNotHighlighted ? [] : hit[attribute];
}

// use for json arrays of objects, e.g. [{ "avatar": "http://...", "name": "Otto" }, { "avatar": "http://...", "name": "Jack" }],
// because Algolia highlights exact json key -> value, e.g. [{ "name": "<em>Ott</em>o", ... }]
function highlightedValueInArray(attribute, key, value, hit, emptyIfNotHighlighted=false) {
  if(attribute in hit._highlightResult) {
    let hits = hit._highlightResult[attribute].filter(x => (key in x) && x[key].matchedWords.length > 0);
    hits = hits.reduce((acc, obj) => {
      let objValue = obj[key].value;
      let objKey = objValue.replace(/<em>/g, '').replace(/<\/em>/g, '');
      acc[objKey] = objValue;
      return acc;
    }, {});
    if (value in hits) {
      return hits[value];
    }
  }
  return emptyIfNotHighlighted ? "" : hit[attribute];
}

function highlightedValueWithClass(attribute, hit, emptyIfNotHighlighted) {
  return highlightWithClass(highlightedValue(attribute, hit, emptyIfNotHighlighted));
}

function highlightWithClass(value) {
  return value ? value.replace(/<em>/g, '<em class="algolia_highlight">') : value;
}

function removeAlgoliaHighlight(json_text, json_keys) {
  let result = json_text;
  for (let json_key of json_keys) {
    const re = new RegExp(`"${json_key}":\\s*.*?[},]`, "g");
    const matches = (json_text.match(re) || []).filter(m => m.indexOf('<em>') > -1);
    for (let m of matches) {
      result = result.replace(m, m.replace(/<em>/g, '').replace(/<\/em>/g, ''));
    }
  }
  result = removeEscapedAlgoliaHighlight(result);
  return result;
}

function removeEscapedAlgoliaHighlight(text) {
  // also remove escaped '<em>' tags which can happen when Algolia highlights a letter in an escape sequence such as unicode character: \ud83d -> \<em>u</em>d83d
  // this is needed, because otherwise json parser will choke on it
  if (text.indexOf('\\<em>') > -1) {
    text = text.split('\\<em>').map(token => token.replace('</em>', '')).join('\\');
  }
  return text;
}

function cleanJsonContent(content_text, json_keys, user_id) {
  if (!content_text) {
    return null;
  }
  // in case of json formatted content, the parsed json object may contain highlighted (<em>...</em>) snippets
  // as atribute names, so we must remove those before using the json later on
  const content = removeAlgoliaHighlight(content_text, json_keys);
  // NOTE: do not change old style function to arrow function in next line, because it won't work ('this' has different scope in arrow functions)
  try {
    return JSON.parse(content, function(key, value) {
      const new_value = (typeof value  === 'string' || value instanceof String) ? highlightWithClass(value) : value;
      if (key.indexOf('<em>') > -1) {
        this[key.replace(/<em>/g, '').replace(/<\/em>/g, '')] = new_value;
        return;
      }
      return new_value;
    });
  } catch(err) {
    opbeat.captureError(err, {
      extra: {
        user: user_id
      }
    });
  }
}
