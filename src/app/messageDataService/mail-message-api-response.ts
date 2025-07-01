export interface MessageContentResponse {
	mailMessage: MailMessageModel
}

export const messageContentResponse: MessageContentResponse = {
    mailMessage: {
		messageNumber  : "",
		to  : "",
		from  : "",
		cc  : "",
		bcc  : "",
		subject  : "",
		body  : "",
		receivedDate  : "",
		attachment:[ { contentType  : "", fileName  : "" , file: { path  : "", name  : ""},charset  : "",saved: false }]
	} 

};
export interface MailMessageModel {
	messageNumber  : String,
	to  : string,
	from  : string,
	cc  : string,
	bcc  : string,
	subject  : string,
	body  : string,
	receivedDate  : string,
	attachment: FileItem[]
}

export interface FileItem {
	contentType  : string,
	fileName  : string
	file  : File,
	charset  : string,
	saved: boolean
}

export interface File {
	path  : string,
	name  : string
}


export interface StreamingResponseBody {
	mailMessage: MailMessageModel
}