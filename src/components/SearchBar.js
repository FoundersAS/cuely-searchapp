import React, {Component} from 'react';
import ReactDOM from 'react-dom';

export default class SearchBar extends Component {
  componentDidMount() {
    ReactDOM.findDOMNode(this.refs.input).focus();
  }

  render() {
    console.log(this.props);
    return (
      <div className={this.props.className} id={this.props.id}>
        <input type="text" placeholder="Cuely search" className="search_bar_input" onKeyUp={this.props.onKeyUp} onInput={this.props.onInput} ref='input' />
      </div>
    );
  }
}
