//help info: https://github.com/nodejs/node/issues/26357
//help info: https://github.com/node-modules/agentkeepalive

const http = require('http');
const AgentKA = require('agentkeepalive');
const { exec } = require("child_process");

// Backend mock service
const backend_service_host = "127.0.0.1.9091";

const defaultAgent = new http.Agent({
  keepAlive: false
});

const optimaldefaultAgent = new http.Agent({
  keepAlive: true, // Keep sockets around in a pool to be used by other requests in the future
  keepAliveMsecs: 30000, // specifies the initial delay for TCP Keep-Alive packets
  maxFreeSockets: 10, // Maximum number of sockets to leave open in a free state, which not turn into TIME_WAIT from ESTABLISHED and keep connection reusable, until idle timeout reached. Max Keepalive sockets??
  maxSockets: 100, // Maximum number of sockets to allow per host
  timeout: 60000, // Socket Idle timeout in milliseconds, Client Side TCP Connection will be from ESTABLISHED to TIME_WAIT
  scheduling: 'fifo' //Scheduling strategy to apply when picking the next free socket to use, or 'lifo'
});

const keepaliveAgent = new AgentKA({
  keepAlive: true, // Keep sockets around in a pool to be used by other requests in the future
  keepAliveMsecs: 30000, // specifies the initial delay for TCP Keep-Alive packets, really works???
  maxSockets: 100, // Maximum number of sockets to allow per host
  maxFreeSockets:10, // Maximum number of sockets (per host) to leave open in a free state
  timeout: 60000, // Sets the working socket to timeout after timeout milliseconds of inactivity on the working socket
  freeSocketTimeout: 15000, // Sets the free socket to timeout after freeSocketTimeout milliseconds of inactivity on the free socket.
  socketActiveTTL: null // Sets the socket active time to live, even if it's in use. avoid the TCP connection leak
});

const options = {
  host: '127.0.0.1', 
  port: '9091',
  path: '/',
  method: 'GET',
  agent: optimaldefaultAgent //could be: optimaldefaultAgent, keepaliveAgent, defaultAgent or false
};

//handle incoming requests
const server = http.createServer(function (request, response) {
  //console.log(request.url);
  const proxy_req = http.request(options, res => {
    //console.log('STATUS: ' + res.statusCode);
    res.setEncoding('utf-8');
    res.on('data', function (chunk) {
      //console.log('BODY: ' + chunk);
    });
    res.on('end', () => {
      response.end(`${res.statusCode}`);
    })
  });
  proxy_req.end();
});

// listen for incoming requests
server.listen(5000);

console.log('Nodejs server is running against 5000 port');

setInterval(() => {
  exec(`netstat -ant | grep TIME_WAIT | grep ${backend_service_host} | wc -l`, (error, stdout, stderr) => {
      console.log(`Sockets in TIME_WAIT: ${stdout}`);
  });
  exec(`netstat -ant | grep ESTABLISHED | grep ${backend_service_host} | wc -l`, (error, stdout, stderr) => {
    console.log(`Sockets in ESTABLISHED: ${stdout}`);
  });
}, 3000);
