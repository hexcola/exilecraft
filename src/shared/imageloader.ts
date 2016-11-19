import * as Immutable from "immutable";
import * as URI from "urijs";

var images = require.context("../assets/images/bundled", true, /.*/);

export class ImageLoader
{
	private static ElementCache : Immutable.Map<string, Promise<HTMLImageElement>> =
		Immutable.Map<string, Promise<HTMLImageElement>>();

	public static FillCache() : void
	{
		images.keys().forEach(imageFileName =>
		{
			var url = URI(imageFileName);
			var promise = new Promise<HTMLImageElement>(resolve =>
			{
				var sprite = new Image();
				sprite.src = "data:image/" + url.suffix() + ";base64," + images(imageFileName);
				sprite.onload = () => resolve(sprite);
			});

			ImageLoader.ElementCache = ImageLoader.ElementCache.set(url.filename(), promise);
		});
	}

	public static LoadSingle(urlToLoad : string) : Promise<HTMLImageElement>
	{
		var url = URI(urlToLoad);
		var fileName = url.filename();
		return ImageLoader.ElementCache.get(fileName);
	}
}
