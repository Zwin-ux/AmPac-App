const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'mobile',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const addNewClientRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddNewClient', inputVars);
}
addNewClientRef.operationName = 'AddNewClient';
exports.addNewClientRef = addNewClientRef;

exports.addNewClient = function addNewClient(dcOrVars, vars) {
  return executeMutation(addNewClientRef(dcOrVars, vars));
};

const listRoomsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListRooms');
}
listRoomsRef.operationName = 'ListRooms';
exports.listRoomsRef = listRoomsRef;

exports.listRooms = function listRooms(dc) {
  return executeQuery(listRoomsRef(dc));
};

const createNewBookingRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewBooking', inputVars);
}
createNewBookingRef.operationName = 'CreateNewBooking';
exports.createNewBookingRef = createNewBookingRef;

exports.createNewBooking = function createNewBooking(dcOrVars, vars) {
  return executeMutation(createNewBookingRef(dcOrVars, vars));
};

const getClientSupportMessagesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetClientSupportMessages', inputVars);
}
getClientSupportMessagesRef.operationName = 'GetClientSupportMessages';
exports.getClientSupportMessagesRef = getClientSupportMessagesRef;

exports.getClientSupportMessages = function getClientSupportMessages(dcOrVars, vars) {
  return executeQuery(getClientSupportMessagesRef(dcOrVars, vars));
};
