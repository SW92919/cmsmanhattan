export interface FolderResponse {
	children : FolderResponse[],
	name  : string,
	fullName  : string,
	delimiter  : string,
	messageCount  : number,
	unseenMessageCount  : number,
	subscribed: boolean,
	hasChildren: boolean
}


export const folderResponse: FolderResponse = {
 	children : [],
	name  : "",
	fullName  : "",
	delimiter  : "",
	messageCount  : 0,
	unseenMessageCount  :0,
	subscribed: false,
	hasChildren: false
};