import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import showdown from 'showdown';

const converter = new showdown.Converter();

export default class GdriveContent extends Component {
  constructor(props){
    super();
    this.fixLinks = ::this.fixLinks;
    this.linkify = ::this.linkify;
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

  renderRow(row, i) {
    let cells = [];
    for (let k=0;k < row.length;k++) {
      if (i === -1) {
        cells.push(<th key={`tableHeader_${k}`} dangerouslySetInnerHTML={{ __html: row[k] }}></th>);
      } else {
        cells.push(<td key={`tableCell${i}_${k}`} dangerouslySetInnerHTML={{ __html: row[k] }}></td>);
      }
    }

    return (
      <tr key={`tableRow${i}`}>
        {cells}
      </tr>
    )
  }

  renderContentValue(content) {
    if (content instanceof Array) {
      return (
        <table id="searchSuggestionsContentTable">
          <thead>
            {this.renderRow(content[0], -1)}
          </thead>
          <tbody>
            {content.slice(1).map(this.renderRow)}
          </tbody>
        </table>
      )
    }
    else if (typeof(content) === 'string'){
      content = this.linkify(content); 
      content = converter.makeHtml(content);
      content = this.newLineRemover(content);
    }
    return (
      <pre id="SuggestionsContentPre" className="content_section_text" dangerouslySetInnerHTML={{ __html: content }} />
    )
  }

  render() {
    const item = this.props.item;
    if (!item) {
      return null;
    }
    if (!item.content) {
      return (
        <div>
          <div className="content_section_title">contents</div>
          <div className="no_preview">No preview available.</div>
        </div>
      )
    } else if (item.metaInfo.users.length > 1) {
      return (
        <div>
          <div className="content_section_title">Co-authors</div>
          <div className="avatars">
            {item.metaInfo.users.map((user, i) => (
                    user.avatar ? <div key={`avatar_${i}_${user.name}`} style={{ backgroundImage: 'url(' + user.avatar + ')' }} className={user.nameHighlight ? "avatar active" : "avatar"} />
                                : <div key={`avatar_${i}_${user.name}`} className={user.nameHighlight ? "avatar no_avatar active" : "avatar no_avatar"}>{this.initials(user.name)}</div>))}
          </div>
          <div className="content_section_title">contents</div>
          {this.renderContentValue(item.content)}
        </div>
      )
    }
    else {
      return (
        <div>
          <div className="content_section_title">contents</div>
          {this.renderContentValue(item.content)}
        </div>
      )
    }
  }
  
  // ---- UTILITIES
  initials(username) {
    return username.split(' ').map(x => x[0]).slice(0, 2).join('');
  }

  linkify(text) {
    const urlFullRegex =/(www.)?[-A-Za-z0-9+&@#\/%=~_|]*(<em class="algolia_highlight">)[-A-Za-z0-9+&@#\/%=~_|]*(<\/em>)[-A-Za-z0-9+&@#\/%=~_|]*[.](com|net|me|io|org|edu|co|dk|de)|(\b(https?|ftp|file):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*(<em class="algolia_highlight">)[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*(<\/em>)[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*)|(\b(https?|ftp|file):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*[-A-Za-z0-9+&@#\/%=~_|]|(www.)?[-A-Za-z0-9+&@#\/%=~_|]+[.](com|net|me|io|org|edu|co|dk|de))/ig;

    return text.replace(urlFullRegex, this.fixLinks);
  }

  fixLinks(url) {
    const urlEmRegex = /(www.)?[-A-Za-z0-9+&@#\/%=~_|]*(<em class="algolia_highlight">)[-A-Za-z0-9+&@#\/%=~_|]*(<\/em>)[-A-Za-z0-9+&@#\/%=~_|]*[.](com|net|me|io|org|edu|co|dk|de)|(\b(https?|ftp|file):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*(<em class="algolia_highlight">)[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*(<\/em>)[-A-Za-z0-9+&@#\/%?=~_|!:,.;]*)/;

    let href = null;
    if (urlEmRegex.test(url)) {
      const [first, rest] = url.split('<em class="algolia_highlight">');
      const [second, third] = rest.split('</em>');
      href = this.checkProtocol(first) + second + third;
    } else {
      href = this.checkProtocol(url);
    }
    return `<a href="${href}" class="content_link">${url}</a>`
  }

  checkProtocol(url){
    var urlProtocolRegex =/(\b(https?|ftp|file):\/\/)/;

    return urlProtocolRegex.test(url) ? url : 'http://' + url;
  }

  newLineRemover(text) {
    var urlRegex = /(\n\n)|\r?\n|\r/g;
    var urlRegexPar = /((<p>)[\s\S]*?(<\/p>))/g;

    text = text.replace(urlRegexPar, line => {
      return line.replace(/\r?\n|\r/g, () => '<br>');
    });

    return text.replace(urlRegex, () => '');
  }

  openLink(e) {
    e.preventDefault();
    this.props.openExternalLink(e.target.href, 'clicked link in content text');
  }
}
