<p align="center">
  <img src="https://raw.githubusercontent.com/roctoproject/rocto-server/api-spec/icon.png" width="20%"></img>
  <h1 align="center">rocto-server</h1>
  <p align="center">
    <a href="https://travis-ci.org/roctoproject/rocto-server"><img src="https://travis-ci.org/roctoproject/rocto-server.svg"></a>
    </a>
  </p>
</p>
<br/>

## How to build & run

1. Install [`node.js`](https://nodejs.org/en/download/).
2. `git clone https://github.com/roctoproject/rocto-server.git`
3. Open repo in terminal/shell.
4. Set up the necessary node modules: `npm install`
5. OPTIONAL: install pm2 to use daemons: `npm install -g pm2`
6. OPTIONAL: fill out `ip-address:port` on line 16 of `init-db.js` and `npm run init-db`. This resets the database. You can also add a number (default 100) after the init-db call to specify how many tasks should be initialised.
6. Run the server: `npm start` OR `pm2 start rocto.js --name rocto`
7. The server is now running on port `8080`
