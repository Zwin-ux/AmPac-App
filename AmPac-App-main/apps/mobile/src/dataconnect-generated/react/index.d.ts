import { AddNewClientData, AddNewClientVariables, ListRoomsData, CreateNewBookingData, CreateNewBookingVariables, GetClientSupportMessagesData, GetClientSupportMessagesVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useAddNewClient(options?: useDataConnectMutationOptions<AddNewClientData, FirebaseError, AddNewClientVariables>): UseDataConnectMutationResult<AddNewClientData, AddNewClientVariables>;
export function useAddNewClient(dc: DataConnect, options?: useDataConnectMutationOptions<AddNewClientData, FirebaseError, AddNewClientVariables>): UseDataConnectMutationResult<AddNewClientData, AddNewClientVariables>;

export function useListRooms(options?: useDataConnectQueryOptions<ListRoomsData>): UseDataConnectQueryResult<ListRoomsData, undefined>;
export function useListRooms(dc: DataConnect, options?: useDataConnectQueryOptions<ListRoomsData>): UseDataConnectQueryResult<ListRoomsData, undefined>;

export function useCreateNewBooking(options?: useDataConnectMutationOptions<CreateNewBookingData, FirebaseError, CreateNewBookingVariables>): UseDataConnectMutationResult<CreateNewBookingData, CreateNewBookingVariables>;
export function useCreateNewBooking(dc: DataConnect, options?: useDataConnectMutationOptions<CreateNewBookingData, FirebaseError, CreateNewBookingVariables>): UseDataConnectMutationResult<CreateNewBookingData, CreateNewBookingVariables>;

export function useGetClientSupportMessages(vars: GetClientSupportMessagesVariables, options?: useDataConnectQueryOptions<GetClientSupportMessagesData>): UseDataConnectQueryResult<GetClientSupportMessagesData, GetClientSupportMessagesVariables>;
export function useGetClientSupportMessages(dc: DataConnect, vars: GetClientSupportMessagesVariables, options?: useDataConnectQueryOptions<GetClientSupportMessagesData>): UseDataConnectQueryResult<GetClientSupportMessagesData, GetClientSupportMessagesVariables>;
