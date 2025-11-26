import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'mobile',
  location: 'us-east4'
};

export const addNewClientRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddNewClient', inputVars);
}
addNewClientRef.operationName = 'AddNewClient';

export function addNewClient(dcOrVars, vars) {
  return executeMutation(addNewClientRef(dcOrVars, vars));
}

export const listRoomsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListRooms');
}
listRoomsRef.operationName = 'ListRooms';

export function listRooms(dc) {
  return executeQuery(listRoomsRef(dc));
}

export const createNewBookingRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewBooking', inputVars);
}
createNewBookingRef.operationName = 'CreateNewBooking';

export function createNewBooking(dcOrVars, vars) {
  return executeMutation(createNewBookingRef(dcOrVars, vars));
}

export const getClientSupportMessagesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetClientSupportMessages', inputVars);
}
getClientSupportMessagesRef.operationName = 'GetClientSupportMessages';

export function getClientSupportMessages(dcOrVars, vars) {
  return executeQuery(getClientSupportMessagesRef(dcOrVars, vars));
}

