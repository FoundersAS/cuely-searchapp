import 'babel-polyfill'; // generators
import React from 'react';
import { render as renderReact } from 'react-dom';

let App = require('./app.js').default;
const render = (Component) => {
  renderReact(<Component />, document.getElementById('app'));
};

if (module.hot) {
  module.hot.accept('./app.js', function() {
    let newApp = require('./app.js').default;
    render(newApp);
  });
}
