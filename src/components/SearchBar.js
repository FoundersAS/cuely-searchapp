import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class SearchBar extends Component {
  constructor(props){
    super();
    this.setFocus = ::this.setFocus;
  }

  componentDidMount() {
    ReactDOM.findDOMNode(this.refs.input).focus();
  }

  componentDidUpdate() {
    const input = ReactDOM.findDOMNode(this.refs.input);
    if (this.props.selectedIndex < 0) {
      input.focus();
    }
    if (this.props.clearInput) {
      input.value = ''
    }
  }

  setFocus() {
    ReactDOM.findDOMNode(this.refs.input).focus();
  }

  render() {
    return (
      <div className={this.props.className} id={this.props.id}>
        <input
          type="text"
          placeholder="Search your company Google Drive"
          className="search_bar_input"
          onKeyUp={this.props.onKeyUp}
          onKeyDown={this.props.onKeyDown}
          onInput={this.props.onInput}
          ref='input' />
      </div>
    );
  }
}
