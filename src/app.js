import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import { ipcRenderer, shell } from 'electron';

import { Scrollbars } from 'react-custom-scrollbars';
import SearchBar from './components/SearchBar';
import CuelyLogo from './logos/cuely-logo.svg';
import GoogleLogo from './logos/google-logo.png';

export default class App extends Component {
  constructor(props){
    super();
    this.handleInput = ::this.handleInput;
    this.handleInputClick = ::this.handleInputClick;
    this.handleKeyUp = ::this.handleKeyUp;
    this.renderItem = ::this.renderItem;
    this.renderSelectedItemContent = ::this.renderSelectedItemContent;
    this.resetState = ::this.resetState;
    this.handleContentKeyDown = ::this.handleContentKeyDown;
    this.state = {
      searchResults: [],
      selectedIndex: -1,
      clearInput: false
    }
  }

  resetState() {
    this.setState({ searchResults: [], selectedIndex: -1, clearInput: true });
  }

  componentDidMount() {
    ipcRenderer.on('searchResult', (event, arg) => {
      this.setState({ searchResults: arg, clearInput: false, selectedIndex: arg.length > 0 ? 0 : -1 });
    });
    ipcRenderer.on('clear', () => {
      this.resetState();
    });
  }

  componentDidUpdate() {
    const h = this.getElementHeight("searchSuggestionsList");
    const listHeight = Math.max(200, h + 1);

    if (h > 0) {
      const content = document.getElementById("searchSuggestionsContent");
      if (content) {
        // adjust the content height (for <pre> element)
        content.style.height = listHeight + 'px';
        // scroll the content to first highlight result (or to beginning if there's no highlighted result)
        const elms = document.getElementsByClassName("algolia_highlight");
        if (elms && elms.length > 0) {
          elms[0].scrollIntoView(false);
        } else {
          content.scrollTop = 0;
        }
      }
    }

    // adjust the window height to the height of the list
    const winHeight = (h > 0 ? listHeight : h) + this.getElementHeight("searchBar");
    ipcRenderer.send('search_rendered', { height: winHeight });

    if (this.refs.scrollbars && this.state.selectedIndex > -1) {
      const itemHeight = parseInt(this.refs.scrollbars.getScrollHeight() / this.state.searchResults.length / 1.5);
      this.refs.scrollbars.scrollTop(itemHeight * this.state.selectedIndex);
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
    if (e.ctrlKey || e.metaKey) {
      return;
    }
    // pass focus to search bar, so key up event will fire on input instead of content
    this.refs.searchBar.setFocus();
  }

  handleKeyUp(e) {
    let index = this.state.selectedIndex;
    if (e.key === 'Escape') {
      if (e.target.value || index > -1) {
        e.target.value = '';
        this.resetState();
      } else {
        ipcRenderer.send('hide-search');
      }
    } else if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
      e.preventDefault();
      let index = this.state.selectedIndex;
      index = (index >= this.state.searchResults.length - 1) ? index : index + 1;
      this.setState({ selectedIndex: index });
    } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
      e.preventDefault();
      index = (index < 0) ? index : index - 1;
      this.setState({ selectedIndex: index });
    } else if (e.key === 'Enter') {
      if (index > -1) {
        shell.openExternal(this.state.searchResults[index].webLink);
        ipcRenderer.send('hide-search');
      }
    }
  }

  handleInput(e) {
    if (e.target.value) {
      ipcRenderer.send('search', e.target.value);
    } else {
      this.resetState();
    }
  }

  handleInputClick(e) {
    this.setState({ selectedIndex: this.state.searchResults.length > 0 ? 0 : -1 });
    this.refs.scrollbars.scrollToTop();
  }

  renderItem(item, i) {
    const liClass = (i === this.state.selectedIndex) ? 'search_suggestions_card_highlight' : 'search_suggestions_card';
    const icon = item.displayIcon ? item.displayIcon : (item.type === 'intra' ? CuelyLogo : GoogleLogo);

    return (
      <li key={i} className={liClass} ref={`searchItem${i}`}>
        <div className="search_suggestion_card_link">
          <img src={icon} className="search_suggestions_logo" />
          <div className="search_suggestions_data">
            <div className="title" dangerouslySetInnerHTML={{ __html: item.title }} />
            <div className="body">
              <div><span className="attribute_label">Edit:&nbsp;</span><span>{item.metaInfo.time}</span></div>
              {item.metaInfo.users.map(user => (<div className="user"><span className="attribute_label">{user.type}:&nbsp;</span><span className="user_name" dangerouslySetInnerHTML={{ __html: user.name }} ></span></div>))}
            </div>
          </div>
        </div>
      </li>
    )
  }

  renderSelectedItemContent(i) {
    if (i < 0) {
      return null;
    }
    const item = this.state.searchResults[i];
    return (
      <pre id="searchSuggestionsContentPre" dangerouslySetInnerHTML={{ __html: item.content }} />
    )
  }

  renderSearchResults() {
    return (
      <div className="search_suggestions" id="searchSuggestions" onKeyUp={this.handleKeyUp}>
        <div className="search_suggestions_list">
          <Scrollbars autoHeight autoHeightMin={0} autoHeightMax={400} style={{ border: 'none' }} ref="scrollbars">
            <ul id="searchSuggestionsList">
              {this.state.searchResults.map(this.renderItem)}
            </ul>
          </Scrollbars>
        </div>
        <div className="search_suggestions_content" id="searchSuggestionsContent" onKeyDown={this.handleContentKeyDown} tabIndex="0">
          {this.renderSelectedItemContent(this.state.selectedIndex)}
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
          onClick={this.handleInputClick}
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
