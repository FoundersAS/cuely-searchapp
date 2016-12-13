import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class LocalFileContent extends Component {
  constructor(props) {
    super();
  }

  renderAttribute(attr) {
    return (attr ? attr : '/');
  }

  render() {
    const item = this.props.item;
    if (!item) {
      return null;
    }
    return (
      <div>
        <div className="content_section_title">Properties</div>
        <div className="content_section_text">
          <div className="content_row">
            <div className="content_attribute_name">Type</div>
            <div className="content_attribute_value">{this.renderAttribute(item.mime)}</div>
          </div>
          <div className="content_row">
            <div className="content_attribute_name">Size</div>
            <div className="content_attribute_value">{this.renderAttribute(item.metaInfo.size)}</div>
          </div>     
        </div>
      </div>
    )
  }
}
