var fs = require("fs");
var path = require("path");
var bufferCls = require('buffer');
var archiver = require('archiver');
var crypto = require('crypto');
function internalForEachFile(pathToFind,callback){
    if(!fs.existsSync(pathToFind)){
        return;
    }
    dir = ///$/.test(dir) ? dir : dir + '/';
    (function dir(dirpath, fn) {
        if(!dirpath.endsWith("/")){
            dirpath += "/";
        }
        var files = fs.readdirSync(dirpath);
        for (var i in files) {
            var item = files[i];
            var info = fs.statSync(dirpath + "/" + item);
            if (info.isDirectory()) {
                dir(dirpath + item + '/', callback);
            } else {
                if(dirpath[dirpath.length-1] == "/"){
                    callback(dirpath  + item);
                }
                else{
                    callback(dirpath + "/" + item);
                }
                
            }

        }

    })(pathToFind);
}



function forEachFile(pathToFind,callback){
    var files = [];
    internalForEachFile(pathToFind,function(file){
        files.push(file);
    });
    if(callback){
        for(var i=0;i<files.length;++i){
            callback(files[i]);
        }
    }
    
    return files;
}
var ignoreFolder = [
    ".svn",
    ".git",
    "node_modules",
    ".vscode",
];
function needIgnore(file){
    for(var i=0;i<ignoreFolder.length;++i){
    if(file.indexOf(ignoreFolder[i]) != -1){
        return true;
    }

    }
    return false;
}

function zipFiles(files,toFile,cb){
    var zipFile = path.resolve(toFile);
    
    
   var output = fs.createWriteStream(zipFile);
   var archive = archiver('zip', {zlib: { level: 9 }});
   archive.pipe(output);

     for(var i=0;i<files.length;++i){
         var file = files[i];
         if(needIgnore(file)){
             return;
         }
        
       archive.file(file, { name: file.zipName });
    }

    output.on("close",cb)
   archive.finalize();
}

function writeFileInternal(src, dst, secureKey) {

    var fd = fs.openSync(src, "r");
    var state = fs.fstatSync(fd);
    if(state.size == 0){
        fs.closeSync(fd);
        fs.writeFileSync(dst, "");
        return;
    }

    var totSize = state.size;
    var MAX_SINGLE_SIZE = 1024000;
    var readedSize = 0;
    var fdw = fs.openSync(dst,"w");
    var readNext = function(){
        var needReadSize = totSize - readedSize;
        if(needReadSize > MAX_SINGLE_SIZE){
            needReadSize = MAX_SINGLE_SIZE;
        }
        var bufferNew = new Buffer(needReadSize);
        fs.readSync(fd, bufferNew, 0, needReadSize, readedSize);
        var len = needReadSize;

        if(secureKey){
        	var key2 = 8 - secureKey;
        	for(var i=0;i<len;++i){
	            bufferNew[i] = bufferNew[i] >>> secureKey | bufferNew[i] << key2;
	        }
        }
        
        fs.writeSync(fdw, bufferNew,0,needReadSize,readedSize);
       // delete bufferNew;
        readedSize += needReadSize;
        if(readedSize < totSize){
            readNext();
        }
        else{
            fs.closeSync(fd);
            fs.closeSync(fdw);
        }
    };
    readNext();
}

//the last is filename



function createFolders(dst,withFileName) {
    var paths = dst.match(/[^\/\\]+/g);
    if(!paths || paths.length === 0){
        return false;
    }
    var curPath = [];
    var len = paths.length;
    if(withFileName){
    	len -= 1;
    }
    if(dst.startsWith("/")){
        paths[0]="/"+paths[0];
    }
    for(var i=0;i<len;++i){
        curPath.push(paths[i]);
        var pathName = curPath.join("/");
        if(!fs.existsSync(pathName)){
            fs.mkdirSync(pathName);
        }
    }
    return true;
}




function copyFile(src, dst, secureKey){
    if(!fs.existsSync(src)){
        return;
    }
	if(fs.existsSync(dst)){
        
        fs.unlinkSync(dst);
    }

    createFolders(dst,true);

    writeFileInternal(src, dst, secureKey);
}


function toFolder(folder){
    if(folder.endsWith("/")){
        return folder;
    }
    return folder+"/";
}

function removeFolders(pathToFind){
        if(!fs.existsSync(pathToFind)){
            return;
        }
        pathToFind = toFolder(pathToFind);
		dir = ///$/.test(dir) ? dir : dir + '/';
        (function dir(dirpath) {
            var files = fs.readdirSync(dirpath);
            for (var i in files) {
                var item = files[i];
                var info = fs.statSync(dirpath + "/" + item);
                if (info.isDirectory()) {
                    dir(dirpath + item + '/');
                    fs.rmdirSync(dirpath  + item);
                } else {
                    if(dirpath[dirpath.length-1] == "/"){
                        fs.unlinkSync(dirpath  + item);
                    }
                    else{
                        fs.unlinkSync(dirpath + "/" + item);
                    }
                    
                }

            }

        })(pathToFind);
};

function copyFolder(src,dst){
    var len = src.length;
    forEachFile(src,function(file){
        copyFile(file,dst+file.substr(len,file.length-len));
    });
}

function createWorkSpaceHash(workspaceRoot,tempPath){
    workspaceRoot=path.resolve(workspaceRoot);
    var HashFile = tempPath+"__.hash";
    var hash = {};
    
    
    if(fs.existsSync(HashFile)){
        hash = JSON.parse(fs.readFileSync(HashFile));
    }

    function save(){
        createFolders(HashFile,true);
        fs.writeFileSync(HashFile,JSON.stringify(hash));
    }

    function has(id){
        return hash[id];
    }
    function get(id){
        return hash[id];
    }
    function set(id,info){
        hash[id] = info;
    }
    function temp(file){
        var newPath = path.resolve(tempPath+path.resolve(file).replace(workspaceRoot,"").substr(1));
        createFolders(newPath,true);
        return newPath;
    }
    return {
        has,get,set,save,temp
    }
}
function md5(file){
    var md5sum = crypto.createHash('md5');
    var stream = fs.readFileSync(file);
    md5sum.update(stream);
    return md5sum.digest('hex').toUpperCase();
};

module.exports = {
	forEachFile:forEachFile,
    createFolders:createFolders,
	copyFile:copyFile,
    removeFolders:removeFolders,
    copyFolder:copyFolder,
    createWorkSpaceHash:createWorkSpaceHash,
    md5:md5,
    zipFiles:zipFiles,
    
};