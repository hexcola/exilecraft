import {ParsingConstants} from "../parsing/parsingconstants";
import {ImageLoader} from "../imageloader";
import {ImageType} from "./enums";
import {ImageLayer} from "./enums";
import {Size} from "../size";
import {Point} from "../point";

export class SkillTreeImage
{
	public Url : string;
	public Offset : Point;
	public Size : Size;
	public Element : HTMLImageElement;
	public SpriteLocation : Point;
	public SpriteSize : Size;
	public Layer : ImageLayer;
	public Type : ImageType;
	public RotationInRadians : number;

	public constructor()
	{
		this.Url = "";
		this.RotationInRadians = 0;
		this.Offset = new Point(0, 0);
		this.SpriteLocation = new Point(0, 0);
	}

	public ChangeLayer(newLayer : ImageLayer) : SkillTreeImage
	{
		this.Layer = newLayer;
		return this;
	}

	public LoadImage() : Promise<any>
	{
		return ImageLoader.LoadSingle(this.Url).then(htmlImage =>
		{
			this.Element = htmlImage;

			if (this.Type == ImageType.File)
			{
				this.Size = new Size(this.Element.width / ParsingConstants.highestResolutionZoomFactor, this.Element.height / ParsingConstants.highestResolutionZoomFactor);
				this.SpriteSize = new Size(this.Element.width, this.Element.height);
			}
		});
	}
}