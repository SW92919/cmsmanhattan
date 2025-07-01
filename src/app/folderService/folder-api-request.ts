export interface CreateFolderRequest {
	name:string
}

export const createFolderRequest: CreateFolderRequest = {
  name:""
};

export interface MoveFolderRequestSelection {
	selectedFolder:string[],
	targetFolder:string[]
}

export const moveFolderRequestSelection: MoveFolderRequestSelection = {
  selectedFolder:[],
  targetFolder:[]
};

export interface DeleteFolderRequestSelection {
	selectedFolder:string[]
}

export const deleteFolderRequestSelection: DeleteFolderRequestSelection = {
  selectedFolder:[]
};

export interface CreateFolderRequest {
	name:string
}



	