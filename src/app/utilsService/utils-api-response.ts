
/**@abstract
 *  it is the same as FolderResponse - UtilsFolderResponse 
 */
export interface UtilsFolderResponse {
	children : UtilsFolderResponse[],
	name  : string,
	fullName  : string,
	delimiter  : string,
	messageCount  : number,
	unseenMessageCount  : number,
	subscribed: boolean,
	hasChildren: boolean
}


export const folderResponse: UtilsFolderResponse = {
 	children : [],
	name  : "",
	fullName  : "",
	delimiter  : "",
	messageCount  : 0,
	unseenMessageCount  :0,
	subscribed: false,
	hasChildren: false
};