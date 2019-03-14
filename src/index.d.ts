export interface WorkSpaceHash{
    has:(id:string)=>boolean;
    get:(id:string)=>any;
    set:(id:string,obj:any)=>void;
    save:()=>void;
    /**
     * 返回在临时目录中的路径
     */
    temp:(path:string)=>string;
}
export function forEachFile(path:string):string[];
export function createFolders(path:string,hasFileName?:boolean):string;
export function copyFile(src:string,dst:string,secureKey?:string):void;
export function removeFolders(path:string):void;
export function copyFolder(src:string,dst:string):void;
export function createWorkSpaceHash(workspaceRoot:string,tempPath:string):WorkSpaceHash;
export function md5(path:string | Buffer):string;
export function zipFiles(files:string[],zipFile:string,finish:()=>void):void;