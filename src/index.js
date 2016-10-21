import 'babel-polyfill'; // generators
import React from 'react';
import ReactDOM from 'react-dom';

const render = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const route = urlParams.get('route');
  let Component = null;
  // following abomination is needed, because babel chokes on 'require()' with variable
  if (!route || route === 'app') {
    Component = require('./app.js').default;
  } else if (route === 'login') {
    Component = require('./login.js').default;
  } else if (route === 'settings') {
    Component = require('./settings.js').default;
  }
  ReactDOM.render(<Component />, document.getElementById('app'));
};

render();

if (module.hot) {
  module.hot.accept('.', function() {
    render();
  });
}
