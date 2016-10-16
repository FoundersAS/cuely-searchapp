import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import { ipcRenderer, shell } from 'electron';

import { Scrollbars } from 'react-custom-scrollbars';
import SearchBar from './components/SearchBar';
// import CuelyLogo from './logos/cuely-logo.svg';
// import GoogleLogo from './logos/google-logo.png';

export default class App extends Component {
  constructor(props){
    super();
    this.handleInput = ::this.handleInput;
    this.handleKeyUp = ::this.handleKeyUp;
    this.renderItem = ::this.renderItem;
    this.handleClick = ::this.handleClick;
    this.handleDoubleClick = ::this.handleDoubleClick;
    this.handleContentKeyDown = ::this.handleContentKeyDown;
    this.hideHover = ::this.hideHover;
    this.showHover = ::this.showHover;
    this.handleMouseMove = ::this.handleMouseMove;
    this.renderSelectedItemContent = ::this.renderSelectedItemContent;
    this.state = {
      searchResults: [],
      selectedIndex: -1,
      clearInput: false,
      keyFocus: false
    }
    this.hoverDisabled = false;
  }

  componentDidMount() {
    ipcRenderer.on('searchResult', (event, arg) => {
      this.setState({ searchResults: arg, clearInput: false, selectedIndex: arg.length > 0 ? 0 : -1, keyFocus: false });
    });
    ipcRenderer.on('notification', (event, arg) => {
      // show desktop notification
      new Notification(arg.title, arg);
    });
  }

  componentDidUpdate() {
    const content = document.getElementById("searchSuggestionsContent");
    if (content) {
      // scroll the content to first highlight result (or to beginning if there's no highlighted result)
      const elms = document.getElementsByClassName("algolia_highlight");
      if (elms && elms.length > 0) {
        content.scrollTop = elms[0].offsetTop - 150;
      } else {
        content.scrollTop = 0;
      }
    }

    // adjust the window height to the height of the list
    const winHeight = (this.state.searchResults.length > 0 ? 400 : 0) + this.getElementHeight("searchBar");
    ipcRenderer.send('search_rendered', { height: winHeight });
     
    if (this.state.keyFocus && this.refs.scrollbars && this.state.selectedIndex > -1) {
      const node = ReactDOM.findDOMNode(this.refs[`searchItem_${this.state.selectedIndex}`]);
      if (node && node.children) {
        node.children[0].focus();
      }
    }
  }

  getElementHeight(id) {
    const el = document.getElementById(id);
    if (!el) {
      return 0;
    }
    const styleHeight = window.getComputedStyle(el).getPropertyValue("height").slice(0, -2);
    return parseInt(styleHeight);
  }

  handleKeyDown(e) {
    if (e.key === 'ArrowDown' || (e.key === 'ArrowUp')) {
      e.preventDefault();
    }
  }

  handleContentKeyDown(e) {
    // allow 'meta' actions (e.g. copy to clipboard), but pass the rest to input
    if ((e.ctrlKey || e.metaKey) && e.key !== 'a') {
      return;
    }
    // pass focus to search bar, so key up event will fire on input instead of content
    this.refs.searchBar.setFocus();
  }

  handleKeyUp(e) {
    let index = this.state.selectedIndex;
    if (e.key === 'Escape') {
      ipcRenderer.send('hide-search');
    } else if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
      e.preventDefault();
      let index = this.state.selectedIndex;
      index = (index >= this.state.searchResults.length - 1) ? index : index + 1;
      this.setState({ selectedIndex: index, keyFocus: true });
    } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
      e.preventDefault();
      index = (index < 0) ? index : index - 1;
      this.setState({ selectedIndex: index, keyFocus: true });
    } else if (e.key === 'Enter') {
      if (index > -1) {
        shell.openExternal(this.state.searchResults[index].webLink);
        ipcRenderer.send('hide-search');
      }
    }

    this.hideHover();
  }

  handleInput(e) {
    if (e.target.value) {
      ipcRenderer.send('search', e.target.value);
    } else {
      this.setState({ searchResults: [], selectedIndex: -1, clearInput: true, keyFocus: false });
    }
  }

  handleClick(e) {
    e.preventDefault();
    const index = this.getIndex(e.target.id);
    if (index > -1) {
      this.setState({ selectedIndex: index, keyFocus: false });
    }
  }

  handleDoubleClick(e) {
    e.preventDefault();
    const index = this.getIndex(e.target.id);
    if (index > -1) {
      shell.openExternal(this.state.searchResults[index].webLink);
      ipcRenderer.send('hide-search');
    }
  }

  handleMouseMove(e) {
    if (!this.hoverDisabled) {
      this.showHover();
    }
    this.hoverDisabled = false;
  }

  hideHover() {
    this.hoverDisabled = true;
    this.applyClassToSuggestions('search_suggestion_card_link_no_hover');
  }

  showHover() {
    this.hoverDisabled = false;
    this.applyClassToSuggestions('search_suggestion_card_link');
  }

  applyClassToSuggestions(klas) {
    const itemList = document.getElementById("searchSuggestionsList");
    if (itemList) {
      const items = [].slice.call(itemList.getElementsByTagName('a')).filter(tag => tag.id.indexOf('searchItemLink') > -1);
      for (let item of items) {
        item.className = klas;
      }
    }
  }

  getIndex(elementId) {
    return elementId ? parseInt(elementId.split('_').slice(-1)[0]) : -1;
  }

  initials(username) {
    return username.split(' ').map(x => x[0]).slice(0, 2).join('');
  }

  renderItem(item, i) {
    const liClass = (i === this.state.selectedIndex) ? 'search_suggestions_card_highlight' : 'search_suggestions_card';
    // const icon = item.displayIcon ? item.displayIcon : (item.type === 'intra' ? CuelyLogo : GoogleLogo);
    const icon = item.displayIcon;

    return (
      <li key={i} className={liClass} ref={`searchItem_${i}`}>
        <a href="#" onClick={this.handleClick} onDoubleClick={this.handleDoubleClick} onKeyDown={this.handleKeyDown} onMouseMove={this.handleMouseMove} className="search_suggestion_card_link" id={`searchItemLink_${i}`}>
          <img src={icon} className="search_suggestions_logo" />
          <div className="search_suggestions_data">
            <div className="heading">
              <div className="title" dangerouslySetInnerHTML={{ __html: item.title }} />
              <div className="avatars">
                {item.metaInfo.users[0].avatar ? <div style={{ backgroundImage: 'url(' + item.metaInfo.users[0].avatar + ')' }} className={item.metaInfo.users[0].nameHighlight ? "avatar active" : "avatar"} />
                                : <div className={item.metaInfo.users[0].nameHighlight ? "avatar no_avatar active" : "avatar no_avatar"}>{this.initials(item.metaInfo.users[0].name)}</div>}
              </div>
            </div>
            <div className="body">
              <span className="meta_icon glyphicons glyphicons-clock"></span>
              <span className="meta_data">{item.metaInfo.time}</span>
              <span className="action_icon glyphicons glyphicons-link"></span>
            </div>
          </div>
        </a>
      </li>
    )
  }

  renderSelectedItemContent(i) {
    if (i < 0) {
      return null;
    }
    const item = this.state.searchResults[i];
    if (!item.content && item.thumbnailLink) {
      return (
        <img src={item.thumbnailLink} />
      )
    } else if (item.metaInfo.users.length > 1) {
      return (
        <div>
          <div className="title_drive">Co-authors</div>
          <div className="avatars">
            {item.metaInfo.users.map(user => (
                    user.avatar ? <div key={`avatar_${i}_${user.name}`} style={{ backgroundImage: 'url(' + user.avatar + ')' }} className={user.nameHighlight ? "avatar active" : "avatar"} />
                                : <div key={`avatar_${i}_${user.name}`} className={user.nameHighlight ? "avatar no_avatar active" : "avatar no_avatar"}>{this.initials(user.name)}</div>))}
          </div>
          <div className="title_drive">contents</div>
          <pre id="searchSuggestionsContentPre" dangerouslySetInnerHTML={{ __html: item.content }} />
        </div>
      )
    }
    else {
      return (
        <div>
          <div className="title_drive">contents</div>
          <pre id="searchSuggestionsContentPre" dangerouslySetInnerHTML={{ __html: item.content }} />
        </div>
      )
    }
  }

  handleContentScroll(e) {
    const transitionDiv = document.getElementById("contentBottomTransition");
    if ((e.target.scrollHeight - e.target.clientHeight - e.target.scrollTop) < 15 || (e.target.scrollLeft > 0)) {
      transitionDiv.style.display = 'none';
    } else {
      transitionDiv.style.display = 'block';
    }
  }

  renderSearchResults() {
    return (
      <div className="search_suggestions" id="searchSuggestions" onKeyUp={this.handleKeyUp} onKeyDown={this.handleContentKeyDown}>
        <div className="search_suggestions_list" id="searchSuggestionsList">
          <Scrollbars autoHeight autoHeightMin={0} autoHeightMax={400} style={{ border: 'none' }} ref="scrollbars">
            <ul id="searchSuggestionsList">
              {this.state.searchResults.map(this.renderItem)}
            </ul>
          </Scrollbars>
        </div>
        <div className="search_suggestions_content" id="searchSuggestionsContent" onKeyDown={this.handleContentKeyDown} onScroll={this.handleContentScroll} tabIndex="0">
          {this.renderSelectedItemContent(this.state.selectedIndex)}
          <div className="content_bottom_view_link">View in App<span className="glyphicons glyphicons-new-window"></span></div>
          <div className="content_bottom_transition" id="contentBottomTransition"></div>
        </div>
      </div>
    );
  }

  render() {
    const open = this.state.searchResults.length > 0;
    return (
      <div className="search_root">
        <SearchBar
          onKeyUp={this.handleKeyUp}
          onKeyDown={this.handleKeyDown}
          onInput={this.handleInput}
          className={open ? "search_bar_open" : "search_bar"}
          id="searchBar"
          ref="searchBar"
          selectedIndex={this.state.selectedIndex}
          clearInput={this.state.clearInput}
        />
        {open ? this.renderSearchResults() : null}
      </div>
    );
  }
}
