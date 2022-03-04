/*========================================================
 * FILE: scriptures.js
 * AUTHOR: Nathan Sonnenberg
 * DATE: Winter 2022
 *
 * DESCRIPTION: Front-end JavaScript code for The Scriptures, Mapped.
 *              IS 542, Winter 2022, BYU.
 */
/*jslint
    browser, long
*/
/*global
    console, map
*/
/*property
    books, classKey, content, forEach, fullName, getElementById, gridName, hash, 
    href, id, init, innerHTML, length, log, maxBookId, minBookId, numChapters,
    onHashChanged, onerror, onload, open, parse, push, response, sent, slice, 
    split, status
*/

const Scriptures = (function () {
	"use strict";

	/*-------------------------------------------------------
	 *                   CONSTANTS
	 */
	const BOTTOM_PADDING = "<br /><br />";
	const CLASS_BOOKS = "books";
	const CLASS_BUTTON = "btn";
	const CLASS_CHAPTER = "chapter";
	const CLASS_ICON = "material-icons";
	const CLASS_VOLUME = "volume";
	const DIV_BREADCRUMBS = "crumbs";
	const DIV_SCRIPTURES = "scriptures";
	const DIV_SCRIPTURES_CONTAINER_CLASS = "scripcontainer";
	const DIV_SCRIPTURES_NAVIGATOR = "scripnav";
	const ICON_NEXT = ">";
	const ICON_PREVIOUS = "<";
	const INDEX_FLAG = 11;
	const INDEX_LATITUDE = 3;
	const INDEX_LONGITUDE = 4;
	const INDEX_PLACENAME = 2;
	const LAT_LON_PARSER =
		/\((.*),'(.*)',(.*),(.*),(.*),(.*),(.*),(.*),(.*),(.*),'(.*)'\)/;
	const MAX_ZOOM_LEVEL = 18;
	const MIN_ZOOM_LEVEL = 6;
	const REQUEST_GET = "GET";
	const REQUEST_STATUS_OK = 200;
	const REQUEST_STATUS_ERROR = 400;
	const TAG_HEADER5 = "h5";
	const TAG_LIST_ITEM = "li";
	const TAG_SPAN = "span";
	const TAG_UNORDERED_LIST = "ul";
	const TEXT_TOP_LEVEL = "The Scriptures";
	const URL_BASE = "https://scriptures.byu.edu/";
	const URL_BOOKS = `${URL_BASE}mapscrip/model/books.php`;
	const URL_SCRIPTURES = `${URL_BASE}mapscrip/mapgetscrip.php`;
	const URL_VOLUMES = `${URL_BASE}mapscrip/model/volumes.php`;
	const ZOOM_RATIO = 450;

	/*-------------------------------------------------------
	 *                   PRIVATE VARIABLES
	 */
	let books;
	let geoplaces = [];
	let gmMarkers = [];
	let requestedBookId;
	let requestedChapter;
	let requestedNextPrevious;
	let volumes;

	/*-------------------------------------------------------
	 *                   PRIVATE METHOD DECLARATIONS
	 */
	let addGeoplace;
	let addMarkers;
	let ajax;
	let bookChapterValid;
	let booksGrid;
	let booksGridContent;
	let cacheBooks;
	let chaptersGrid;
	let chaptersGridContent;
	let clearMarkers;
	let encodedScripturesUrlParameters;
	let geoplaceIndex;
	let getData;
	let getJson;
	let getScripturesCallback;
	let getScripturesFailure;
	let htmlAnchor;
	let htmlDiv;
	let htmlElement;
	let htmlLink;
	let htmlListItem;
	let htmlListItemLink;
	let init;
	let injectBreadcrumbs;
	let mergePlacename;
	let navigateBook;
	let navigateChapter;
	let navigateHome;
	let nextChapter;
	let nextPreviousMarkup;
	let onHashChanged;
	let previousChapter;
	let setupMarkers;
	let showLocation;
	let titleForBookChapter;
	let volumeForId;
	let volumesGridContent;
	let zoomMapToFitMarkers;

	/*-------------------------------------------------------
	 *                   PRIVATE METHODS
	 */
	addGeoplace = function (placename, latitude, longitude) {
		let index = geoplaceIndex(latitude, longitude);

		if (index >= 0) {
			mergePlacename(placename, index);
		} else {
			geoplaces.push({
				latitude,
				longitude,
				placename,
			});
		}
	};

	addMarkers = function (placename, latitude, longitude) {
		geoplaces.forEach(function (geoplace) {
			const marker = new markerWithLabel.MarkerWithLabel({
				animation: google.maps.Animation.DROP,
				clickable: false,
				draggable: false,
				labelAnchor: new google.maps.Point(0, -3),
				labelClass: "maplabel",
				labelContent: geoplace.placename,
				map,
				position: {
					lat: Number(geoplace.latitude),
					lng: Number(geoplace.longitude),
				},
			});

			gmMarkers.push(marker);
		});
	};

	ajax = function (url, successCallback, failureCallback, skipJsonParse) {
		let request = new XMLHttpRequest();

		request.open(REQUEST_GET, url, true);

		request.onload = function () {
			if (
				this.status >= REQUEST_STATUS_OK &&
				this.status < REQUEST_STATUS_ERROR
			) {
				let data = skipJsonParse
					? request.response
					: JSON.parse(request.response);

				if (typeof successCallback === "function") {
					successCallback(data);
				}
			} else {
				if (typeof failureCallback === "function") {
					failureCallback(request);
				}
			}
		};

		request.onerror = failureCallback;
		request.send();
	};

	bookChapterValid = function (bookId, chapter) {
		let book = books[bookId];

		if (book === undefined || chapter < 0 || chapter > book.numChapters) {
			return false;
		}

		if (chapter === 0 && book.numChapters > 0) {
			return false;
		}

		return true;
	};

	booksGrid = function (volume) {
		return htmlDiv({
			classKey: CLASS_BOOKS,
			content: booksGridContent(volume),
		});
	};

	booksGridContent = function (volume) {
		let gridContent = "";

		volume.books.forEach(function (book) {
			gridContent += htmlLink({
				classKey: CLASS_BUTTON,
				content: book.gridName,
				href: `#${volume.id}:${book.id}`,
				id: book.id,
			});
		});

		return gridContent;
	};

	cacheBooks = function (callback) {
		volumes.forEach(function (volume) {
			let volumeBooks = [];
			let bookId = volume.minBookId;

			while (bookId <= volume.maxBookId) {
				volumeBooks.push(books[bookId]);
				bookId += 1;
			}

			volume.books = volumeBooks;
		});

		if (typeof callback === "function") {
			callback();
		}
	};

	chaptersGrid = function (book) {
		return (
			htmlDiv({
				classKey: CLASS_VOLUME,
				content: htmlElement(TAG_HEADER5, book.fullName),
			}) +
			htmlDiv({
				classKey: CLASS_BOOKS,
				content: chaptersGridContent(book),
			})
		);
	};

	chaptersGridContent = function (book) {
		let gridContent = "";
		let chapter = 1;

		while (chapter <= book.numChapters) {
			gridContent += htmlLink({
				classKey: `${CLASS_BUTTON} ${CLASS_CHAPTER}`,
				content: chapter,
				href: `#0:${book.id}:${chapter}`,
				id: chapter,
			});
			chapter += 1;
		}

		return gridContent;
	};

	clearMarkers = function () {
		gmMarkers.forEach(function (marker) {
			marker.setMap(null);
		});

		gmMarkers = [];
		geoplaces = [];
	};

	encodedScripturesUrlParameters = function (bookId, chapter, verses, isJst) {
		if (bookId !== undefined && chapter !== undefined) {
			let options = "";

			if (verses !== undefined) {
				options += verses;
			}

			if (isJst !== undefined) {
				options += "&jst=JST";
			}

			return `${URL_SCRIPTURES}?book=${bookId}&chap=${chapter}&verses${options}`;
		}
	};

	geoplaceIndex = function (latitude, longitude) {
		let i = geoplaces.length - 1;

		while (i >= 0) {
			const geoplace = geoplaces[i];

			const latitudeDelta = Math.abs(geoplace.latitude - latitude);
			const longitudeDelta = Math.abs(geoplace.longitude - longitude);

			if (latitudeDelta < 0.0000000001 && longitudeDelta < 0.000000001) {
				return i;
			}

			i -= 1;
		}

		return -1;
	};

	getData = function (url, successCallback, failureCallback, skipJsonParse) {
		fetch(url)
			.then(function (response) {
				if (response.ok) {
					if (skipJsonParse) {
						return response.text();
					} else {
						return response.json();
					}
				} else {
					throw new Error("Network response was not okay.");
				}
			})
			.then(function (data) {
				if (typeof successCallback === "function") {
					successCallback(data);
				} else {
					throw new Error("Callback is not a valid function.");
				}
			})
			.catch(function (error) {
				console.log("Error:", error.message);

				if (typeof failureCallback === "function") {
					failureCallback(error);
				}
			});
	};

	getJson = function (url) {
		return fetch(url).then(function (response) {
			if (response.ok) {
				return response.json();
			} else {
				throw new Error("Network response was not okay.");
			}
		});
	};

	getScripturesCallback = function (chapterHtml) {
		let book = books[requestedBookId];

		document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
			id: `${requestedBookId}:${requestedChapter}`,
			classKey: DIV_SCRIPTURES_CONTAINER_CLASS,
			content: chapterHtml,
		});

		//document.getElementById(DIV_SCRIPTURES).innerHTML = chapterHtml;

		document.querySelectorAll(".navheading").forEach(function (element) {
			element.innerHTML += `<div class="nextprev">${requestedNextPrevious}</div>`;
		});

		injectBreadcrumbs(volumeForId(book.parentBookId), book, requestedChapter);
		setupMarkers();
	};

	getScripturesFailure = function () {
		document.getElementById(DIV_SCRIPTURES).innerHTML =
			"Unable to retrieve chapter contents.";
		injectBreadcrumbs();
	};

	htmlAnchor = function (volume) {
		return `<a name="v${volume.id}"></a>`;
	};

	htmlDiv = function (parameters) {
		let classString = "";
		let contentString = "";
		let idString = "";

		if (parameters.classKey !== undefined) {
			classString = ` class="${parameters.classKey}"`;
		}

		if (parameters.content !== undefined) {
			contentString = parameters.content;
		}

		if (parameters.id !== undefined) {
			idString = ` id="${parameters.id}"`;
		}

		return `<div${idString}${classString}>${contentString}</div>`;
	};

	htmlElement = function (tagName, content, classValue) {
		let classString = "";

		if (classValue !== undefined) {
			classString = ` class="${classValue}"`;
		}

		return `<${tagName}${classString}>${content}</${tagName}>`;
	};

	htmlLink = function (parameters) {
		let classString = "";
		let contentString = "";
		let hrefString = "";
		let idString = "";
		let titleString = "";

		if (parameters.classKey !== undefined) {
			classString = ` class="${parameters.classKey}"`;
		}

		if (parameters.content !== undefined) {
			contentString = parameters.content;
		}

		if (parameters.href !== undefined) {
			hrefString = ` href="${parameters.href}"`;
		}

		if (parameters.id !== undefined) {
			idString = ` id="${parameters.id}"`;
		}

		if (parameters.title !== undefined) {
			titleString = ` title="${parameters.title}"`;
		}

		return `<a${idString}${classString}${hrefString}${titleString}>${contentString}</a>`;
	};

	htmlListItem = function (content) {
		return htmlElement(TAG_LIST_ITEM, content);
	};

	htmlListItemLink = function (content, href = "") {
		return htmlListItem(htmlLink({ content, href: `#${href}` }));
	};

	init = function (callback) {
		Promise.all([getJson(URL_BOOKS), getJson(URL_VOLUMES)])
			.then((jsonResults) => {
				let [booksResult, volumesResult] = jsonResults;

				books = booksResult;
				volumes = volumesResult;
				cacheBooks(callback);
			})
			.catch((error) => {
				console.log("Unable to get volumes/books data:", error.message);
			});
	};

	injectBreadcrumbs = function (volume, book, chapter) {
		let crumbs = "";

		if (volume === undefined) {
			crumbs = htmlListItem(TEXT_TOP_LEVEL);
		} else {
			crumbs = htmlListItemLink(TEXT_TOP_LEVEL);

			if (book === undefined) {
				crumbs += htmlListItem(volume.fullName);
			} else {
				crumbs += htmlListItemLink(volume.fullName, volume.id);

				if (chapter === undefined || chapter <= 0) {
					crumbs += htmlListItem(book.tocName);
				} else {
					crumbs += htmlListItemLink(book.tocName, `${volume.id}:${book.id}`);
					crumbs += htmlListItem(chapter);
				}
			}
		}

		document.getElementById(DIV_BREADCRUMBS).innerHTML = htmlElement(
			TAG_UNORDERED_LIST,
			crumbs
		);
	};

	mergePlacename = function (placename, index) {
		let geoplace = geoplaces[index];

		if (!geoplace.placename.includes(placename)) {
			geoplace.placename += ", " + placename;
		}
	};

	navigateBook = function (bookId) {
		let book = books[bookId];

		if (book.numChapters <= 1) {
			navigateChapter(bookId, book.numChapters);
		} else {
			document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
				id: DIV_SCRIPTURES_NAVIGATOR,
				content: chaptersGrid(book),
			});
		}
	};

	navigateChapter = function (bookId, chapter) {
		requestedBookId = bookId;
		requestedChapter = chapter;

		let nextPrev = previousChapter(bookId, chapter);

		if (nextPrev === undefined) {
			requestedNextPrevious = "";
		} else {
			requestedNextPrevious = nextPreviousMarkup(nextPrev, ICON_PREVIOUS);
		}

		nextPrev = nextChapter(bookId, chapter);

		if (nextPrev !== undefined) {
			requestedNextPrevious += nextPreviousMarkup(nextPrev, ICON_NEXT);
		}

		ajax(
			encodedScripturesUrlParameters(bookId, chapter),
			getScripturesCallback,
			getScripturesFailure,
			true
		);
	};

	navigateHome = function (volumeId) {
		document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
			id: DIV_SCRIPTURES_NAVIGATOR,
			content: volumesGridContent(volumeId),
		});

		injectBreadcrumbs(volumeForId(volumeId));
	};

	nextChapter = function (bookId, chapter) {
		let book = books[bookId];

		if (book !== undefined) {
			if (chapter < book.numChapters) {
				return [bookId, chapter + 1, titleForBookChapter(book, chapter + 1)];
			}

			let nextBook = books[bookId + 1];

			if (nextBook !== undefined) {
				let nextChapterValue = 0;

				if (nextBook.numChapters > 0) {
					nextChapterValue = 1;
				}

				return [
					nextBook.id,
					nextChapterValue,
					titleForBookChapter(nextBook, nextChapterValue),
				];
			}
		}
	};

	nextPreviousMarkup = function (nextPrev, icon) {
		return htmlLink({
			content: htmlElement(TAG_SPAN, icon, CLASS_ICON),
			href: `#0:${nextPrev[0]}:${nextPrev[1]}`,
			title: nextPrev[2],
		});
	};

	onHashChanged = function () {
		let ids = [];

		if (location.hash !== "" && location.hash.length > 1) {
			ids = location.hash.slice(1).split(":");
		}

		if (ids.length <= 0) {
			navigateHome();
		} else if (ids.length === 1) {
			let volumeId = Number(ids[0]);

			if (volumeId < volumes[0].id || volumeId > volumes.slice(-1)[0].id) {
				navigateHome();
			} else {
				navigateHome(volumeId);
			}
		} else {
			let bookId = Number(ids[1]);

			if (books[bookId] === undefined) {
				navigateHome();
			} else {
				if (ids.length === 2) {
					navigateBook(bookId);
				} else {
					let chapter = Number(ids[2]);

					if (bookChapterValid(bookId, chapter)) {
						navigateChapter(bookId, chapter);
					} else {
						navigateHome();
					}
				}
			}
		}
	};

	previousChapter = function (bookId, chapter) {
		let book = books[bookId];

		if (book !== undefined) {
			if (chapter > 1) {
				return [bookId, chapter - 1, titleForBookChapter(book, chapter - 1)];
			}

			let previousBook = books[bookId - 1];

			if (previousBook !== undefined) {
				return [
					previousBook.id,
					previousBook.numChapters,
					titleForBookChapter(previousBook, previousBook.numChapters),
				];
			}
		}
	};

	setupMarkers = function () {
		if (gmMarkers.length > 0) {
			clearMarkers();
		}

		let matches;

		document
			.querySelectorAll('a[onclick^="showLocation("]')
			.forEach(function (element) {
				matches = LAT_LON_PARSER.exec(element.getAttribute("onclick"));

				if (matches) {
					let placename = matches[INDEX_PLACENAME];
					let latitude = parseFloat(matches[INDEX_LATITUDE]);
					let longitude = parseFloat(matches[INDEX_LONGITUDE]);
					let flag = matches[INDEX_FLAG];

					if (flag !== "") {
						placename = `${placename} ${flag}`;
					}

					addGeoplace(placename, latitude, longitude);
				}
			});

		if (geoplaces.length > 0) {
			addMarkers();
		}

		zoomMapToFitMarkers(matches);
	};

	showLocation = function (
		id,
		placename,
		latitude,
		longitude,
		viewLatitude,
		viewLongitude,
		viewTilt,
		viewRoll,
		viewAltitude,
		viewHeading
	) {
		console.log(
			id,
			placename,
			latitude,
			longitude,
			viewLatitude,
			viewLongitude,
			viewTilt,
			viewRoll,
			viewAltitude,
			viewHeading
		);
		map.panTo({ lat: latitude, lng: longitude });
		map.setZoom(Math.round(viewAltitude / ZOOM_RATIO));
	};

	titleForBookChapter = function (book, chapter) {
		if (book !== undefined) {
			if (chapter > 0) {
				return `${book.tocName} ${chapter}`;
			}

			return book.tocName;
		}
	};

	volumeForId = function (volumeId) {
		if (volumeId !== undefined && volumeId > 0 && volumeId < volumes.length) {
			return volumes[volumeId - 1];
		}
	};

	volumesGridContent = function (volumeId) {
		let gridContent = "";

		volumes.forEach(function (volume) {
			if (volumeId === undefined || volumeId === volume.id) {
				gridContent += htmlDiv({
					classKey: CLASS_VOLUME,
					content:
						htmlAnchor(volume) + htmlElement(TAG_HEADER5, volume.fullName),
				});

				gridContent += booksGrid(volume);
			}
		});

		return gridContent + BOTTOM_PADDING;
	};

	zoomMapToFitMarkers = function (matches) {
		if (gmMarkers.length > 0) {
			if (gmMarkers.length === 1 && matches) {
				let zoomLevel = Math.round(Number(matches[9]) / ZOOM_RATIO);

				if (zoomLevel < MIN_ZOOM_LEVEL) {
					zoomLevel = MIN_ZOOM_LEVEL;
				} else if (zoomLevel > MAX_ZOOM_LEVEL) {
					zoomLevel = MAX_ZOOM_LEVEL;
				}

				map.setZoom(zoomLevel);
				map.panTo(gmMarkers[0].position);
			} else {
				let bounds = new google.maps.LatLngBounds();

				gmMarkers.forEach(function (marker) {
					bounds.extend(marker.position);
				});

				map.panTo(bounds.getCenter());
				map.fitBounds(bounds);
			}
		}
	};

	/*-------------------------------------------------------
	 *                   PUBLIC API
	 */
	return {
		init,
		onHashChanged,
		showLocation,
	};
})();
