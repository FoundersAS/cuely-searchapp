import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class GithubCommitContent extends Component {
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
    let committerName = item.content.users[0] ? item.content.users[0].nameHighlight || item.content.users[0].name : '/';

    return (
      <div className='content_section'>
        <div className="content_section_title">Commit info</div>
        <div className="content_section_text">
          <div className="content_row">
            <div className="content_attribute_name_narrow">Author</div>
            <div className="content_attribute_value_wide" dangerouslySetInnerHTML={{ __html: committerName }} />
          </div>
          <div className="content_row">
            <div className="content_attribute_name_narrow">Time</div>
            <div className="content_attribute_value_wide" dangerouslySetInnerHTML={{ __html: item.metaInfo.timeFormatted }} />
          </div>
          <div className="content_row">
            <div className="content_attribute_name_narrow">Sha</div>
            <div className="content_attribute_value_wide" dangerouslySetInnerHTML={{ __html: item.content.sha }} />
          </div>
        </div>
      </div>
    );
  }

  renderMessage(item) {
    return (
      <div className='content_section'>
        <div className="content_section_title">Message</div>
        <div id="searchSuggestionsContent" className="content_section_text content_section_pre_text" dangerouslySetInnerHTML={{ __html: item.content.message }} />
      </div>
    );
  }

  renderFiles(files) {
    return (
      <div className='content_section'>
        <div className="content_section_title">Files</div>
        <div className="content_section_text">
          {files.map((f, i) => (
            <div className="content_row style_space_between" key={`fileRow_${i}`}>
              <div className="content_list_file">
                <a href={f.url}>{f.filename}</a>
              </div>
              <div className="content_list_right_side">{f.action}</div>
            </div>
          ))}
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
        {this.renderInfo(item)}
        {this.renderMessage(item)}
        {this.renderFiles(item.content.files)}
      </div>
    )
  }

  // ---- UTILITIES
  initials(username) {
    return username.split(' ').map(x => x[0]).slice(0, 2).join('');
  }
}
