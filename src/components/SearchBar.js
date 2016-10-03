import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class SearchBar extends Component {
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

  render() {
    return (
      <div className={this.props.className} id={this.props.id}>
        <input type="text" placeholder="Cuely search" className="search_bar_input" onClick={this.props.onClick} onKeyUp={this.props.onKeyUp} onInput={this.props.onInput} ref='input' />
      </div>
    );
  }
}
