export interface MessageListResponse {
	messageList:MailMessage[]
}

export interface SearchMessageResponse {
	messageList:MailMessage[]
}

export interface MailMessage {
	
	messageNumber:string,
	status:string,
	attachment:string,
	from:string,
	to:string,
	cc:string,
	bcc:string,
	subject:string,
	receivedDate:string,
	size:string

}


export const searchMessageResponse: SearchMessageResponse = {
    messageList:[ {
		messageNumber:"",
		status:"",
		attachment:"",
		from:"",
		to:"",
		cc:"",
		bcc:"",
		subject:"",
		receivedDate:"",
		size:""
		} ]

};


export const messageListResponse: MessageListResponse = {
    messageList:[ {
		messageNumber:"",
		status:"",
		attachment:"",
		from:"",
		to:"",
		cc:"",
		bcc:"",
		subject:"",
		receivedDate:"",
		size:""
		} ]

};