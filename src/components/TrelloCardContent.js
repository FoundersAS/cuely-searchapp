import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class TrelloCardContent extends Component {
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
    console.log(el);
    while(el.nodeName !== 'A') {
      el = el.parentElement;
      if (el.className === 'content_section_text' || el.nodeName === 'BODY') {
        // oops, no anchor tag found
        return;
      }
    }
    this.props.openExternalLink(el.href, 'Trello link', 'trello_card');
  }

  renderUsers(users, title) {
    if (!users || users.length == 0) {
      return (
        <div className='content_section'>
          <div className="content_section_title">{title}</div>
          <div id="searchSuggestionsContent" className="content_section_text content_section_pure_text">
            <i>This card has no members.</i>
          </div>
        </div>
      )
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

  renderDescription(content) {
    if (!content || !content.description) {
      content = {
        description: "<i>This card has no description.</i>",
      }
    }
    return (
      <div className='content_section'>
        <div className="content_section_title">Description</div>
        <div id="searchSuggestionsContent" className="content_section_text content_section_pure_text" dangerouslySetInnerHTML={{ __html: content.description }} />
      </div>
    );
  }

  renderChecklists(content) {
    if (!content || content.checklists.length == 0) {
      return null;
    }

    return (
      <div className='content_section'>
        <div className="content_section_title">Checklists</div>
        <div className="content_section_text">
          {content.checklists.map((cl, i) => (
            <div key={`trello_list_${i}`}>
              <div className="content_list_title" dangerouslySetInnerHTML={{ __html: `${cl.name} (${cl.items_done}/${cl.items.length})` }} />
              {cl.items && cl.items.length > 0 ? cl.items.map((item, j) => (
                <div className={item.checked ? "content_list_card checked" : "content_list_card"} key={`trello_checklist_${i}_item_${j}`} dangerouslySetInnerHTML={{ __html: item.name }} />
              )) : (<div><i>No items</i></div>)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  renderArchive(content) {
    if (content.closed === true || content.listClosed === true) {
      return (
        <div className="content_warning">
          <div className="background"></div>
          <div className="message">{content.closed ? "This card is archived" : "This card is in an archived list"}</div>
        </div>
      )
    }
    return null;
  }

  render() {
    const item = this.props.item;
    if (!item) {
      return null;
    }
    return (
      <div>
        {this.renderArchive(item.content)}
        {this.renderUsers(item.content.users, 'Members')}
        {this.renderDescription(item.content)}
        {this.renderChecklists(item.content)}
      </div>
    )
  }

  // ---- UTILITIES
  initials(username) {
    return username.split(' ').map(x => x[0]).slice(0, 2).join('');
  }
}
