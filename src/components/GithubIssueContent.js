import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class GithubIssueContent extends Component {
  constructor(props) {
    super();
    this.handleClick = ::this.handleClick;
  }

  componentDidMount() {
    // force didUpdate on initial rendering
    this.componentDidUpdate();
  }

  componentDidUpdate() {
    let cItems = document.getElementsByClassName("content_section_text");
    if (cItems) {
      for (let cItem of cItems) {
        let links = cItem.getElementsByTagName('a');
        if (links) {
          for (let link of links) {
            link.addEventListener("click", this.handleClick, false);
            link.className = 'content_link';
          }
        }
      }
    }
  }

  handleClick(e) {
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
    this.props.openExternalLink(el.href, 'Github commit link', 'github_commit');
  }

  renderInfo(item) {
    return (
      <div className='content_section'>
        <div className="content_section_title">Issue info</div>
        <div className="content_section_text">
          <div className="content_row">
            <div className="content_attribute_name_narrow">Status</div>
            <div className="content_attribute_value_wide" dangerouslySetInnerHTML={{ __html: item.content.state }} />
          </div>
          <div className="content_row">
            <div className="content_attribute_name_narrow">Labels</div>
            <div className="content_attribute_value_wide" dangerouslySetInnerHTML={{ __html: item.content.labels.join(', ') }} />
          </div>
          <div className="content_row">
            <div className="content_attribute_name_narrow">Updated</div>
            <div className="content_attribute_value_wide" dangerouslySetInnerHTML={{ __html: item.metaInfo.timeFormatted }} />
          </div>
        </div>
      </div>
    );
  }

  renderUsers(users, title, groupIndex) {
    if (!users || users.length == 0) {
      return null;
    }

    return (
      <div className='content_section'>
        <div className="content_section_title">{title}</div>
        <div className="avatars">
            {users.map((user, i) => (
                    user.avatar ? <div key={`avatar_${i}_${user.name}`} title={user.name} style={{ backgroundImage: 'url(' + user.avatar + ')' }} className={user.nameHighlight ? "avatar active" : "avatar"} />
                                : <div key={`avatar_${i}_${user.name}`} title={user.name} className={user.nameHighlight ? "avatar no_avatar active" : "avatar no_avatar"}>{this.initials(user.name)}</div>))}
        </div>
      </div>
    )
  }  

  renderBody(item) {
    return (
      <div className='content_section'>
        <div className="content_section_title">Description</div>
        <div id="searchSuggestionsContent" className="content_section_text" dangerouslySetInnerHTML={{ __html: item.content.body }} />
      </div>
    );
  }

  renderComments(userId, comments) {
    if (!comments || comments.length == 0) {
      return null;
    }
    return (
      <div className='content_section'>
        <div className="content_section_title">Comments</div>
        <div className="content_section_text content_section_conversation">
          <div className="conversation_items">
            {comments.map((c, i) => (
              <div className="conversation_item" key={`comment_${userId}_${i}`}>
                <div className="message_user">
                  <div className="message_body" dangerouslySetInnerHTML={{ __html: c.body }} />
                  <div className="conversation_meta avatars">
                    <div title={c.author.name} style={{ backgroundImage: 'url(' + c.author.avatar + ')' }} className="avatar_small" />
                    <div className="time">{c.time}</div>
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
    console.log(item);
    return (
      <div>
        {this.renderUsers(item.content.users.slice(1), 'Assignees', 1)}
        {this.renderInfo(item)}
        {this.renderBody(item)}
        {this.renderComments(item.userId, item.content.comments)}
      </div>
    )
  }

  // ---- UTILITIES
  initials(username) {
    return username.split(' ').map(x => x[0]).slice(0, 2).join('');
  }
}
