import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class SearchBar extends Component {
  componentDidMount() {
    ReactDOM.findDOMNode(this.refs.input).focus();
  }

  componentDidUpdate() {
    if (this.props.selectedIndex < 0) {
      ReactDOM.findDOMNode(this.refs.input).focus();
    }
  }

  render() {
    return (
      <div className={this.props.className} id={this.props.id}>
        <input type="text" placeholder="Cuely search" className="search_bar_input" onKeyUp={this.props.onKeyUp} onInput={this.props.onInput} ref='input' />
      </div>
    );
  }
}
