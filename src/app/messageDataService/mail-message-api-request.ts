export interface MessageContentRequest {
	folder  : string,
	messageNumber  : number,
	renderingType  : number
}

export const messageContentRequest: MessageContentRequest = {
    folder:"",
    messageNumber  : 0,
	renderingType  : 0
};



export interface ForwardMessageContentRequest {
	folder  : string,
	messageNumber  : number,
	renderingType  : number,
	forwardAddress  : string,
	isAttachment  : boolean
}

export const forwardMessageContentRequest: ForwardMessageContentRequest = {
    folder:"",
    messageNumber  : 0,
	renderingType  : 0 ,
	forwardAddress  : "",
	isAttachment  : false
};