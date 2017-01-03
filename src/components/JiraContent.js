import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class JiraContent extends Component {
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
    this.props.openExternalLink(el.href, 'Jira content link', 'Jira');
  }

  renderDescription(description) {
    if (!description) {
      return null;
    }
    return (
      <div className="content_section">
        <div className="content_section_title">Description</div>
        <div id="searchSuggestionsContent" className="content_section_text content_section_pure_text" dangerouslySetInnerHTML={{ __html: description }} />
      </div>
    );
  }

  renderInfo(content) {
    if (!content && !content.info) {
      return null;
    }
    return (
      <div className="content_section">
        <div className="content_section_title">Issue info</div>
        <div className="content_section_text">
          <div className="content_row">
            <div className="content_attribute_name">Project</div>
            <div className="content_attribute_value">
              <a href={content.info.projectLink}><span dangerouslySetInnerHTML={{ __html: content.info.projectName || '/' }} /></a>
            </div>
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Key</div>
            <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: content.info.key || '/' }} />
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Type</div>
            <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: content.info.type || '/' }} />
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Status</div>
            <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: content.info.status || '/' }} />
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Priority</div>
            <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: content.info.priority || '/' }} />
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Due date</div>
            <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: content.info.dueDate || '/' }} />
          </div>          
          <div className="content_row">
            <div className="content_attribute_name">Labels</div>
            <div className="content_attribute_value" dangerouslySetInnerHTML={{ __html: content.info.labels.length > 0 ? content.info.labels.join(', ') : '/' }} />
          </div>
        </div>
      </div>
    );
  }

  renderUsers(item, title) {
    if (!item.content || !item.content.users || item.content.users.length == 0) {
      return null;
    }
    return (
      <div className="content_section">
        <div className="content_section_title">{title}</div>
        <div className="avatars">
            {item.content.users.map((user, i) => (
                    user.avatar ? <div key={`avatar_${i}_${user.name}`} style={{ backgroundImage: 'url(' + user.avatar + ')' }} className={user.nameHighlight ? "avatar active" : "avatar"} />
                                : <div key={`avatar_${i}_${user.name}`} className={user.nameHighlight ? "avatar no_avatar active" : "avatar no_avatar"}>{this.initials(user.name)}</div>))}
        </div>
      </div>
    )
  }

  render() {
    const item = this.props.item;
    if (!item) {
      return null;
    }
    return (
      <div>
        {this.renderUsers(item, 'Members')}
        {this.renderDescription(item.content.description)}
        {this.renderInfo(item.content)}
      </div>
    )
  }

  // ---- UTILITIES
  initials(username) {
    return username.split(' ').map(x => x[0]).slice(0, 2).join('');
  }
}
