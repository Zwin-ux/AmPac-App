# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListRooms*](#listrooms)
  - [*GetClientSupportMessages*](#getclientsupportmessages)
- [**Mutations**](#mutations)
  - [*AddNewClient*](#addnewclient)
  - [*CreateNewBooking*](#createnewbooking)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListRooms
You can execute the `ListRooms` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listRooms(): QueryPromise<ListRoomsData, undefined>;

interface ListRoomsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRoomsData, undefined>;
}
export const listRoomsRef: ListRoomsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listRooms(dc: DataConnect): QueryPromise<ListRoomsData, undefined>;

interface ListRoomsRef {
  ...
  (dc: DataConnect): QueryRef<ListRoomsData, undefined>;
}
export const listRoomsRef: ListRoomsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listRoomsRef:
```typescript
const name = listRoomsRef.operationName;
console.log(name);
```

### Variables
The `ListRooms` query has no variables.
### Return Type
Recall that executing the `ListRooms` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListRoomsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListRoomsData {
  rooms: ({
    id: UUIDString;
    name: string;
    capacity: number;
    description?: string | null;
  } & Room_Key)[];
}
```
### Using `ListRooms`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listRooms } from '@dataconnect/generated';


// Call the `listRooms()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listRooms();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listRooms(dataConnect);

console.log(data.rooms);

// Or, you can use the `Promise` API.
listRooms().then((response) => {
  const data = response.data;
  console.log(data.rooms);
});
```

### Using `ListRooms`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listRoomsRef } from '@dataconnect/generated';


// Call the `listRoomsRef()` function to get a reference to the query.
const ref = listRoomsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listRoomsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.rooms);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.rooms);
});
```

## GetClientSupportMessages
You can execute the `GetClientSupportMessages` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getClientSupportMessages(vars: GetClientSupportMessagesVariables): QueryPromise<GetClientSupportMessagesData, GetClientSupportMessagesVariables>;

interface GetClientSupportMessagesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetClientSupportMessagesVariables): QueryRef<GetClientSupportMessagesData, GetClientSupportMessagesVariables>;
}
export const getClientSupportMessagesRef: GetClientSupportMessagesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getClientSupportMessages(dc: DataConnect, vars: GetClientSupportMessagesVariables): QueryPromise<GetClientSupportMessagesData, GetClientSupportMessagesVariables>;

interface GetClientSupportMessagesRef {
  ...
  (dc: DataConnect, vars: GetClientSupportMessagesVariables): QueryRef<GetClientSupportMessagesData, GetClientSupportMessagesVariables>;
}
export const getClientSupportMessagesRef: GetClientSupportMessagesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getClientSupportMessagesRef:
```typescript
const name = getClientSupportMessagesRef.operationName;
console.log(name);
```

### Variables
The `GetClientSupportMessages` query requires an argument of type `GetClientSupportMessagesVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetClientSupportMessagesVariables {
  clientId: UUIDString;
}
```
### Return Type
Recall that executing the `GetClientSupportMessages` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetClientSupportMessagesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetClientSupportMessagesData {
  supportMessages: ({
    id: UUIDString;
    messageContent: string;
    sentAt: TimestampString;
    isFromClient: boolean;
  } & SupportMessage_Key)[];
}
```
### Using `GetClientSupportMessages`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getClientSupportMessages, GetClientSupportMessagesVariables } from '@dataconnect/generated';

// The `GetClientSupportMessages` query requires an argument of type `GetClientSupportMessagesVariables`:
const getClientSupportMessagesVars: GetClientSupportMessagesVariables = {
  clientId: ..., 
};

// Call the `getClientSupportMessages()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getClientSupportMessages(getClientSupportMessagesVars);
// Variables can be defined inline as well.
const { data } = await getClientSupportMessages({ clientId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getClientSupportMessages(dataConnect, getClientSupportMessagesVars);

console.log(data.supportMessages);

// Or, you can use the `Promise` API.
getClientSupportMessages(getClientSupportMessagesVars).then((response) => {
  const data = response.data;
  console.log(data.supportMessages);
});
```

### Using `GetClientSupportMessages`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getClientSupportMessagesRef, GetClientSupportMessagesVariables } from '@dataconnect/generated';

// The `GetClientSupportMessages` query requires an argument of type `GetClientSupportMessagesVariables`:
const getClientSupportMessagesVars: GetClientSupportMessagesVariables = {
  clientId: ..., 
};

// Call the `getClientSupportMessagesRef()` function to get a reference to the query.
const ref = getClientSupportMessagesRef(getClientSupportMessagesVars);
// Variables can be defined inline as well.
const ref = getClientSupportMessagesRef({ clientId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getClientSupportMessagesRef(dataConnect, getClientSupportMessagesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.supportMessages);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.supportMessages);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## AddNewClient
You can execute the `AddNewClient` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
addNewClient(vars: AddNewClientVariables): MutationPromise<AddNewClientData, AddNewClientVariables>;

interface AddNewClientRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddNewClientVariables): MutationRef<AddNewClientData, AddNewClientVariables>;
}
export const addNewClientRef: AddNewClientRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addNewClient(dc: DataConnect, vars: AddNewClientVariables): MutationPromise<AddNewClientData, AddNewClientVariables>;

interface AddNewClientRef {
  ...
  (dc: DataConnect, vars: AddNewClientVariables): MutationRef<AddNewClientData, AddNewClientVariables>;
}
export const addNewClientRef: AddNewClientRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addNewClientRef:
```typescript
const name = addNewClientRef.operationName;
console.log(name);
```

### Variables
The `AddNewClient` mutation requires an argument of type `AddNewClientVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddNewClientVariables {
  address: string;
  companyName: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}
```
### Return Type
Recall that executing the `AddNewClient` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddNewClientData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddNewClientData {
  client_insert: Client_Key;
}
```
### Using `AddNewClient`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addNewClient, AddNewClientVariables } from '@dataconnect/generated';

// The `AddNewClient` mutation requires an argument of type `AddNewClientVariables`:
const addNewClientVars: AddNewClientVariables = {
  address: ..., 
  companyName: ..., 
  email: ..., 
  firstName: ..., 
  lastName: ..., 
  phoneNumber: ..., 
};

// Call the `addNewClient()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addNewClient(addNewClientVars);
// Variables can be defined inline as well.
const { data } = await addNewClient({ address: ..., companyName: ..., email: ..., firstName: ..., lastName: ..., phoneNumber: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addNewClient(dataConnect, addNewClientVars);

console.log(data.client_insert);

// Or, you can use the `Promise` API.
addNewClient(addNewClientVars).then((response) => {
  const data = response.data;
  console.log(data.client_insert);
});
```

### Using `AddNewClient`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addNewClientRef, AddNewClientVariables } from '@dataconnect/generated';

// The `AddNewClient` mutation requires an argument of type `AddNewClientVariables`:
const addNewClientVars: AddNewClientVariables = {
  address: ..., 
  companyName: ..., 
  email: ..., 
  firstName: ..., 
  lastName: ..., 
  phoneNumber: ..., 
};

// Call the `addNewClientRef()` function to get a reference to the mutation.
const ref = addNewClientRef(addNewClientVars);
// Variables can be defined inline as well.
const ref = addNewClientRef({ address: ..., companyName: ..., email: ..., firstName: ..., lastName: ..., phoneNumber: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addNewClientRef(dataConnect, addNewClientVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.client_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.client_insert);
});
```

## CreateNewBooking
You can execute the `CreateNewBooking` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createNewBooking(vars: CreateNewBookingVariables): MutationPromise<CreateNewBookingData, CreateNewBookingVariables>;

interface CreateNewBookingRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewBookingVariables): MutationRef<CreateNewBookingData, CreateNewBookingVariables>;
}
export const createNewBookingRef: CreateNewBookingRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createNewBooking(dc: DataConnect, vars: CreateNewBookingVariables): MutationPromise<CreateNewBookingData, CreateNewBookingVariables>;

interface CreateNewBookingRef {
  ...
  (dc: DataConnect, vars: CreateNewBookingVariables): MutationRef<CreateNewBookingData, CreateNewBookingVariables>;
}
export const createNewBookingRef: CreateNewBookingRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createNewBookingRef:
```typescript
const name = createNewBookingRef.operationName;
console.log(name);
```

### Variables
The `CreateNewBooking` mutation requires an argument of type `CreateNewBookingVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateNewBookingVariables {
  clientId: UUIDString;
  roomId: UUIDString;
  bookingDate: DateString;
  startTime: TimestampString;
  endTime: TimestampString;
  purpose: string;
}
```
### Return Type
Recall that executing the `CreateNewBooking` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateNewBookingData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateNewBookingData {
  booking_insert: Booking_Key;
}
```
### Using `CreateNewBooking`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createNewBooking, CreateNewBookingVariables } from '@dataconnect/generated';

// The `CreateNewBooking` mutation requires an argument of type `CreateNewBookingVariables`:
const createNewBookingVars: CreateNewBookingVariables = {
  clientId: ..., 
  roomId: ..., 
  bookingDate: ..., 
  startTime: ..., 
  endTime: ..., 
  purpose: ..., 
};

// Call the `createNewBooking()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createNewBooking(createNewBookingVars);
// Variables can be defined inline as well.
const { data } = await createNewBooking({ clientId: ..., roomId: ..., bookingDate: ..., startTime: ..., endTime: ..., purpose: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createNewBooking(dataConnect, createNewBookingVars);

console.log(data.booking_insert);

// Or, you can use the `Promise` API.
createNewBooking(createNewBookingVars).then((response) => {
  const data = response.data;
  console.log(data.booking_insert);
});
```

### Using `CreateNewBooking`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createNewBookingRef, CreateNewBookingVariables } from '@dataconnect/generated';

// The `CreateNewBooking` mutation requires an argument of type `CreateNewBookingVariables`:
const createNewBookingVars: CreateNewBookingVariables = {
  clientId: ..., 
  roomId: ..., 
  bookingDate: ..., 
  startTime: ..., 
  endTime: ..., 
  purpose: ..., 
};

// Call the `createNewBookingRef()` function to get a reference to the mutation.
const ref = createNewBookingRef(createNewBookingVars);
// Variables can be defined inline as well.
const ref = createNewBookingRef({ clientId: ..., roomId: ..., bookingDate: ..., startTime: ..., endTime: ..., purpose: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createNewBookingRef(dataConnect, createNewBookingVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.booking_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.booking_insert);
});
```

