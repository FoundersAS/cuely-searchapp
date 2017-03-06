import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class TrelloBoardContent extends Component {
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
    this.props.openExternalLink(el.href, 'Trello link', 'trello_board');
  }

  renderUsers(users, title) {
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

  renderLists(content) {
    if (!content || content.lists.length == 0) {
      return null;
    }

    return (
      <div className='content_section'>
        <div className="content_section_title">Open cards</div>
        <div className="content_section_text">
            {content.lists.map((list, i) => (
                <div key={`trello_list_${i}`}>
                  <div className="content_list_title" dangerouslySetInnerHTML={{ __html: list.name }} />
                  {list.cards && list.cards.length > 0 ? list.cards.map((card, j) => (
                    <div className="content_list_card" key={`trello_list_${i}_card_${j}`}>
                      <a href={card.url} dangerouslySetInnerHTML={{ __html: card.name }} />
                    </div>
                  )) : (<div><i>No cards</i></div>)}
                </div>
            ))}
        </div>
      </div>
    )
  }

  renderDescription(content) {
    if (!content || !content.description) {
      return null;
    }
    return (
      <div className='content_section'>
        <div className="content_section_title">Description</div>
        <div id="searchSuggestionsContent" className="content_section_text content_section_pure_text" dangerouslySetInnerHTML={{ __html: content.description }} />
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
        {this.renderUsers(item.content.users, 'Members')}
        {this.renderDescription(item.content)}
        {this.renderLists(item.content)}
      </div>
    )
  }

  // ---- UTILITIES
  initials(username) {
    return username.split(' ').map(x => x[0]).slice(0, 2).join('');
  }
}
