import {ParsingConstants} from "./parsingconstants";
import * as Immutable from "immutable";

export class TreeConverter
{
	public static Decode(encodedBuild : string) : Array<number>
	{
		var nodes = [];
		var encodedBuild = encodedBuild.replace(/-/g, "+").replace(/_/g, "/");
		var decodedBuild = atob(encodedBuild);

		for (var i = 6; i < decodedBuild.length; i += 2)
		{
			nodes.push(decodedBuild.charCodeAt(i)*256+decodedBuild.charCodeAt(i+1));
		}

		var classId = decodedBuild[4].charCodeAt(0);
		var className = ParsingConstants.ClassIdentifierToName[classId];
		var classNodeId = ParsingConstants.ClassToNodeId[className];
		nodes.push(classNodeId);
		return nodes;
	}

	public static Encode(classId : number, nodeIds : Array<number>) : string
	{
		var encodedBuild = "";
		var sortedNumbers = Immutable.List<number>(nodeIds).sortBy(v => v).toArray();
		var numbers = [0, 3, classId << 8].concat(sortedNumbers);

    	for(var i=0; i<numbers.length; i++)
		{
			var char1 = (numbers[i] & 0xff00) >> 8;
			var char2 = numbers[i] & 0x00ff;
			encodedBuild += String.fromCharCode(char1) + String.fromCharCode(char2);
    	}

		return btoa(encodedBuild);
	}
}
