import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AddNewClientData {
  client_insert: Client_Key;
}

export interface AddNewClientVariables {
  address: string;
  companyName: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface Booking_Key {
  id: UUIDString;
  __typename?: 'Booking_Key';
}

export interface Client_Key {
  id: UUIDString;
  __typename?: 'Client_Key';
}

export interface CreateNewBookingData {
  booking_insert: Booking_Key;
}

export interface CreateNewBookingVariables {
  clientId: UUIDString;
  roomId: UUIDString;
  bookingDate: DateString;
  startTime: TimestampString;
  endTime: TimestampString;
  purpose: string;
}

export interface Document_Key {
  id: UUIDString;
  __typename?: 'Document_Key';
}

export interface GetClientSupportMessagesData {
  supportMessages: ({
    id: UUIDString;
    messageContent: string;
    sentAt: TimestampString;
    isFromClient: boolean;
  } & SupportMessage_Key)[];
}

export interface GetClientSupportMessagesVariables {
  clientId: UUIDString;
}

export interface ListRoomsData {
  rooms: ({
    id: UUIDString;
    name: string;
    capacity: number;
    description?: string | null;
  } & Room_Key)[];
}

export interface OnboardingTask_Key {
  id: UUIDString;
  __typename?: 'OnboardingTask_Key';
}

export interface Room_Key {
  id: UUIDString;
  __typename?: 'Room_Key';
}

export interface SupportMessage_Key {
  id: UUIDString;
  __typename?: 'SupportMessage_Key';
}

interface AddNewClientRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddNewClientVariables): MutationRef<AddNewClientData, AddNewClientVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddNewClientVariables): MutationRef<AddNewClientData, AddNewClientVariables>;
  operationName: string;
}
export const addNewClientRef: AddNewClientRef;

export function addNewClient(vars: AddNewClientVariables): MutationPromise<AddNewClientData, AddNewClientVariables>;
export function addNewClient(dc: DataConnect, vars: AddNewClientVariables): MutationPromise<AddNewClientData, AddNewClientVariables>;

interface ListRoomsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRoomsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListRoomsData, undefined>;
  operationName: string;
}
export const listRoomsRef: ListRoomsRef;

export function listRooms(): QueryPromise<ListRoomsData, undefined>;
export function listRooms(dc: DataConnect): QueryPromise<ListRoomsData, undefined>;

interface CreateNewBookingRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewBookingVariables): MutationRef<CreateNewBookingData, CreateNewBookingVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateNewBookingVariables): MutationRef<CreateNewBookingData, CreateNewBookingVariables>;
  operationName: string;
}
export const createNewBookingRef: CreateNewBookingRef;

export function createNewBooking(vars: CreateNewBookingVariables): MutationPromise<CreateNewBookingData, CreateNewBookingVariables>;
export function createNewBooking(dc: DataConnect, vars: CreateNewBookingVariables): MutationPromise<CreateNewBookingData, CreateNewBookingVariables>;

interface GetClientSupportMessagesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetClientSupportMessagesVariables): QueryRef<GetClientSupportMessagesData, GetClientSupportMessagesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetClientSupportMessagesVariables): QueryRef<GetClientSupportMessagesData, GetClientSupportMessagesVariables>;
  operationName: string;
}
export const getClientSupportMessagesRef: GetClientSupportMessagesRef;

export function getClientSupportMessages(vars: GetClientSupportMessagesVariables): QueryPromise<GetClientSupportMessagesData, GetClientSupportMessagesVariables>;
export function getClientSupportMessages(dc: DataConnect, vars: GetClientSupportMessagesVariables): QueryPromise<GetClientSupportMessagesData, GetClientSupportMessagesVariables>;

