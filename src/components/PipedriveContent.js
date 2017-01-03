import React, {Component} from 'react';
import ReactDOM from 'react-dom';


const activityTypes = {
  'call': 'glyphicons-earphone',
  'meeting': 'glyphicons-family',
  'task': 'glyphicons-clock',
  'deadline': 'glyphicons-flag',
  'email': 'glyphicons-send',
  'lunch': 'glyphicons-coffee-cup',
}

export default class PipedriveContent extends Component {
  constructor(props) {
    super();
    this.openLink = ::this.openLink;
  }

  componentDidMount() {
    // force didUpdate on initial rendering
    this.componentDidUpdate();
  }

  componentDidUpdate() {
    for (let itemLink of document.getElementsByClassName("content_link")) {
      itemLink.addEventListener("click", this.openLink, false);
    }
  }

  openLink(e) {
    e.preventDefault();
    // get actual <a> tag
    let el = e.target;
    while(el.nodeName !== 'A') {
      el = el.parentElement;
      if (el.className === 'content_section_text' || el.nodeName === 'BODY') {
        // oops, no anchor tag found
        return;
      }
    }
    this.props.openExternalLink(el.href, 'Pipedrive contact/user link', 'pipedrive');
  }

  renderAttribute(attr) {
    return (attr ? attr : '/');
  }

  renderAttributeValue(value, currency) {
    return (value ? value + ' ' + currency : '/');
  }

  renderUsers (item, title, groupIndex) {
    if (!item.metaInfo || !item.metaInfo.users || item.metaInfo.users.length == 0) {
      return null;
    }
    return (
      <div className='content_section'>
        <div className="content_section_title">{title}</div>
        <div className="avatars">
            {item.metaInfo.users.map((user, i) => (
                    user.avatar ? <div key={`avatar_${i}_${user.name}`} style={{ backgroundImage: 'url(' + user.avatar + ')' }} className={user.nameHighlight ? "avatar active" : "avatar"} />
                                : <div key={`avatar_${i}_${user.name}`} className={user.nameHighlight ? "avatar no_avatar active" : "avatar no_avatar"}>{this.initials(user.name)}</div>))}
        </div>
      </div>
    )
  }

  renderContacts(people, title, groupIndex) {
    if (!people || people.length == 0) {
      return null;
    }
    return (
      <div className='content_section'>
        <div className="content_section_title">{title}&nbsp;({people.length})</div>
        <div className="content_section_text">
          {people.map((p, i) => (
            <div className="content_row style_space_between" key={`peopleRow_${groupIndex}_${i}`}>
              <a href={p.url} className="content_link"><div className="content_list_value" dangerouslySetInnerHTML={{ __html: p.name }} /></a>
              <div className="content_list_right_side" dangerouslySetInnerHTML={{ __html: p.email }} />
            </div>
          ))}
        </div> 
      </div>
    )
  }

  renderActivityIcon(activity) {
    const iconClass = activityTypes[activity.type];
    if (iconClass) {
      return (<span className={`meta_icon glyphicons ${iconClass}`}></span>)
    }
    return null;
  }

  renderActivities(activites) {
    if (!activites || activites.length == 0) {
      return null;
    }
    return (
      <div className='content_section'>
        <div className="content_section_title">Activity</div>
        <div className="content_section_text content_section_conversation">
          <div className="conversation_group">
            {activites.map((activity, i) => (
              <div key={`activity_${i}`}>
                <div className="conversation_items">
                  <div className="conversation_item">
                    <div className="message_user">
                      <div className="message_body" dangerouslySetInnerHTML={{ __html: activity.subject }} />
                        <div className="conversation_meta">
                          <span>
                            {this.renderActivityIcon(activity)}
                            <span dangerouslySetInnerHTML={{ __html: `${activity.username.split(' ')[0]} → ${activity.contact}` }} />&nbsp;—&nbsp;{activity.doneTime}
                          </span>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  render() {
    const item = this.props.item;
    if (!item) {
      return null;
    }
    return (
      <div>
        {this.renderUsers(item, 'Collaborators', 1)}
        <div className='content_section'>
          <div className="content_section_title">Deal info</div>
          <div className="content_section_text">
            <div className="content_row">
              <div className="content_attribute_name">Company</div>
              <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: item.content.company }} />
            </div>
            <div className="content_row">
              <div className="content_attribute_name">Deal value</div>
              <div className="content_attribute_value">{this.renderAttributeValue(item.content.value, item.content.currency)}</div>
            </div>
            <div className="content_row">
              <div className="content_attribute_name">Status</div>
              <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: item.metaInfo.status || '/' }} />
            </div>
            <div className="content_row">
              <div className="content_attribute_name">Stage</div>
              <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: item.metaInfo.stage || '/' }} />
            </div>
          </div>
        </div>

        {this.renderContacts(item.content.contacts, 'Associated contacts', 0)}
        {this.renderActivities(item.content.activities)}
      </div>
    )
  }

  // ---- UTILITIES
  initials(username) {
    return username.split(' ').map(x => x[0]).slice(0, 2).join('');
  }
}
