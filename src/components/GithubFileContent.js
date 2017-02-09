import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class GithubFileContent extends Component {
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
    this.props.openExternalLink(el.href, 'Github file link', 'github_file');
  }

  renderInfo(item) {
    let committerName = item.content.users[0] ? item.content.users[0].nameHighlight || item.content.users[0].name : '/';

    return (
      <div className='content_section'>
        <div className="content_section_title">Info</div>
        <div className="content_section_text">
          <div className="content_row">
            <div className="content_attribute_name_narrow">Repo</div>
            <div className="content_attribute_value_wide" dangerouslySetInnerHTML={{ __html: item.metaInfo.status }} />
          </div>
          <div className="content_row">
            <div className="content_attribute_name_narrow">Full path</div>
            <div className="content_attribute_value_wide" dangerouslySetInnerHTML={{ __html: item.content.path }} />
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

  render() {
    const item = this.props.item;
    if (!item) {
      return null;
    }
    return (
      <div>
        {this.renderUsers(item.content.users, 'Committers', 1)}
        {this.renderInfo(item)}
      </div>
    )
  }

  // ---- UTILITIES
  initials(username) {
    return username.split(' ').map(x => x[0]).slice(0, 2).join('');
  }
}
