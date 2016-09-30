import AlgoliaSearch from 'algoliasearch';
import { fromIsoDateToElapsed } from '../util.js';

const algoliaConf = {
  appId: 'OPDWYH4IR4',
  searchKey: '0b28a5913167a1618773992171c04344',
  indexName: 'questions_answers'
}
const algoliaClient = AlgoliaSearch(algoliaConf.appId, algoliaConf.searchKey);
const index = algoliaClient.initIndex(algoliaConf.indexName);
const settings = {
  distinct: true,
  getRankingInfo: true,
  filters: `questionTeamId=9`,
  hitsPerPage: 10
};

export function search(query) {
  return index.search(query, settings).then(content => {
    return content.hits.map(hit => {
      let modified = hit.questionModified;
      if (hit.answerModified) {
        modified = (new Date(hit.questionModified) > new Date(hit.answerModified)) ? hit.questionModified : hit.answerModified;
      }
      return {
        type: 'intra',
        title: hit.questionTitle,
        body: [
          'Tags: ' + hit.questionTags.join(', '),
          'Last change: ' + fromIsoDateToElapsed(modified),
        ],
        infoUser: hit.questionUsername,
        infoUserType: 'Creator',
        webLink: 'http://intra.pipetop.com/questions/' + hit.questionId,
        modified: modified,
        _algolia: hit['_rankingInfo']
      }
    });
  });
}

// ------------ Dummy data/testing
const data = [
  {tag: "Customer Support", question: "What applications / tools do we use in customer support?", answer: ""},
  {tag: "Customer Support", question: "Complaint - 'How do I cancel your service?'", answer: "Go to settings page and click on the 'Delete account' button."},
  {tag: "Customer Support", question: "Complaint - 'You do not seem to care.'", answer: ""},
  {tag: "Customer Support", question: "Complaint - 'I bought your product but it does not do what it is supposed to do.'", answer: ""},
  {tag: "Customer Support", question: "Complaint - 'I talked to someone else and they were no help.'", answer: ""},
  {tag: "Sales", question: "What applications / tools do we use in sales?", answer: ""},
  {tag: "Sales", question: "What’s our pricing?", answer: ""},
  {tag: "Sales", question: "What’s our security?", answer: ""},
  {tag: "Sales", question: "Objection - 'I just need to run this by our XY.'", answer: ""},
  {tag: "Sales", question: "Objection - 'This is not a priority right now'", answer: ""},
  {tag: "Engineering", question: "What applications / tools do we use in engineering?", answer: ""},
  {tag: "Engineering", question: "What’s our infrastructure stack?", answer: ""},
  {tag: "Engineering", question: "Where do we host our infrastructure?", answer: ""},
  {tag: "Engineering", question: "Who takes care of security?", answer: ""},
  {tag: "Engineering", question: "How often do we deploy our products?", answer: "Expect changes on a daily basis."}, 
  {tag: "Marketing", question: "What applications / tools do we use in marketing?", answer: ""},
  {tag: "Marketing", question: "Who manages our website?", answer: "It's self-managed. If you need to change it, then wait until the need goes away."},
  {tag: "Marketing", question: "What are our typical customer segments?", answer: ""},
  {tag: "Marketing", question: "Where do I find our marketing assets?", answer: ""},
  {tag: "Marketing", question: "What marketing channels are we using?", answer: ""},
  {tag: "Hiring", question: "What applications / tools do we use in the hiring process?", answer: ""},
  {tag: "Hiring", question: "What are our hiring guidelines?", answer: "Hire the best, ditch the rest."},
  {tag: "Hiring", question: "Which job boards do we post new positions on?", answer: ""},
  {tag: "Hiring", question: "What’s our primary job listings page?", answer: ""},
  {tag: "Hiring", question: "Who manages our job listings?", answer: ""},
  {tag: "Clients", question: "What applications / tools do we use for managing clients?", answer: ""},
  {tag: "Clients", question: "Who are our most important clients?", answer: ""},
  {tag: "Clients", question: "Who manages each of the important clients?", answer: "Simon manages everything."},
  {tag: "Clients", question: "What projects are we currently running?", answer: ""},
  {tag: "Design", question: "What applications / tools do we use for design?", answer: ""},
  {tag: "Design", question: "What are our design guidelines?", answer: "In company's google drive."},
  {tag: "Design", question: "Where do we find our logos / design assets?", answer: ""},
  {tag: "Office", question: "How do we access the office?", answer: "Enter on ground floor through job center, then use the elevator to arrive on 5th floor."},
  {tag: "Office", question: "How do we reserve meeting rooms?", answer: "Talk to Olga."},
  {tag: "Office", question: "How do we use the printer(s)?", answer: ""},
  {tag: "Office", question: "What are some good restaurants around the office?", answer: ""},
  {tag: "Office", question: "What are some good places to order food from?", answer: ""},
  {tag: "Company", question: "What’s our company address?", answer: "Skelbækgade 2, 1717 København"},
  {tag: "Company", question: "What’s our company bank account?", answer: ""},
  {tag: "Company", question: "What’s our company registration details?", answer: ""},
  {tag: "Company", question: "How do we report expenses?", answer: ""},
  {tag: "Company", question: "How do we report vacation?", answer: "Digilently!"},
  {tag: "Company", question: "How do we report sickness absence?", answer: "As soon as you can, but no later than 10 minutes after the boss arrives to the office."}
]

const changed = [
  '5 minutes',
  '25 minutes',
  '40 minutes',
  '55 minutes',
  '1 hour',
  '2 hours',
  '3 hours',
  '5 hours',
  '8 hours',
  '1 day',
  '2 days',
  '3 days',
  '5 days',
  '10 days'
]

const users = [
  'Jan Gnezda', 'Jakob Marovt', 'Rasmus Burkal', 'Alvin Šipraga', 'Jordi Colomer', 'Jacob Wejendorp'
]

export function searchDummy(query) {
  const q = query.toLowerCase();
  return data.filter(x => contains(x, q)).map(x => {
    const user = random(users);
    const created = random(changed);
    return {
      tag: x.tag,
      question: x.question,
      questionModified: random(changed),
      questionAuthor: random(users),
      answer: x.answer,
      answerModified: x.answer ? random(changed) : null,
      answerAuthor: x.answer ? random(users) : null
    }
  });
}

function contains(item, q) {
  const members = ['tag', 'question', 'answer']
  return members.filter(x => item[x].toLowerCase().indexOf(q) > -1).length > 0;
}

function random(array) {
  return array[Math.floor((Math.random() * array.length))];
}
