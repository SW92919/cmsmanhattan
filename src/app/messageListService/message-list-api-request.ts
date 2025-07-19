export interface SearchMessageRequest {
  searchkey: string;
  folder: string;
}

export const searchMessageRequest: SearchMessageRequest = {
  searchkey: '',
  folder: '',
};

export interface MessageListRequest {
  startMsgNumber: number;
  lastMsgNumber: number;
  folder: string;
}

export const messageListRequest: MessageListRequest = {
  startMsgNumber: 0,
  lastMsgNumber: 20,
  folder: '',
};

export interface DeleteMessageRequest {
  folder: string;
  message: string[];
}

export const deleteMessageRequest: DeleteMessageRequest = {
  folder: '',
  message: [],
};

export interface MoveMessageRequest {
  folder: string;
  message: string[];
  destination: string;
}

export const moveMessageRequest: MoveMessageRequest = {
  folder: '',
  message: [],
  destination: '',
};
