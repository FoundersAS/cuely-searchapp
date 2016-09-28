import 'babel-polyfill'; // generators
import React from 'react';
import ReactDOM from 'react-dom';

let App = require('./app.js').default;
const render = (Component) => {
  ReactDOM.render(<Component />, document.getElementById('app'));
};

render(App);
if (module.hot) {
  module.hot.accept('.', function() {
    let newApp = require('./app.js').default;
    render(newApp);
  });
}
