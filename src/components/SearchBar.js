import React, {Component} from 'react';

export default class SearchBar extends Component {
  render() {
    console.log(this.props);
    return (
      <div className="search_bar">
        <input type="text" placeholder="Cuely search" className="search_bar_input" onKeyDown={this.props.onKeyDown} />
      </div>
    );
  }
}
