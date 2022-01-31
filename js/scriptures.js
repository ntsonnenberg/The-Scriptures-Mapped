/*========================================================
 * FILE: scriptures.js
 * AUTHOR: Nathan Sonnenberg
 * DATE: Winter 2022
 * 
 * DESCRIPTION: Front-end JavaScript code for The Scriptures, Mapped.
 *              IS 542, Winter 2022, BYU.
 */
/*property
    books, classKey, content, forEach, hash, href, id, init, location, log,
    maxBoodId, minBookId, onHashChanged, onerror, onload, open, parse, push,
    response, sent, status
*/

const Scriptures = (function () {
    "use strict";

    /*-------------------------------------------------------
     *                   CONSTANTS
     */
    const BOTTOM_PADDING = '<br /><br />';
    const CLASS_BOOKS = 'books';
    const CALSS_VOLUMES = 'volume';
    const DIV_SCRIPTURES_NAVIGATOR = 'scripnav';
    const DIV_SCRIPTURES = 'scriptures';
    const REQUEST_GET = 'GET';
    const REQUEST_STATUS_OK = 200;
    const REQUEST_STATUS_ERROR = 400;
    const TAG_HEADERS = 'h5';
    const URL_BASE = 'https://scriptures.byu.edu/';
    const USL_BOOKS = `${URL_BASE}mapscrip/model/books.php`;
    const URL_VOLUMES = `${URL_BASE}mapscrip/model/volumes.php`;

     /*-------------------------------------------------------
     *                   PRIVATE VARIABLES
     */
    let books;
    let volumes;

    /*-------------------------------------------------------
     *                   PRIVATE METHOD DECLARATIONS
     */
    let ajax;
    let bookChapterValid;
    let cacheBooks;
    let htmlAnchor;
    let htmlDiv;
    let htmlElement;
    let htmlLink;
    let htmlHashLink;
    let init;
    let navigateBook;
    let navigateChapter;
    let navigateHome;
    let onHashChanged;
    let testGeoplaces;

     /*-------------------------------------------------------
     *                   PRIVATE METHODS
     */
    ajax = function (url, successCallback, failureCallback) {
        let request = new XMLHttpRequest();

        request.open(REQUEST_GET, url, true);

        request.onload = function() {
            if (this.status >= REQUEST_STATUS_OK && this.status < REQUEST_STATUS_ERROR) {
                // Success!
                let data = JSON.parse(this.response);

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

    cacheBooks = function (callback) {
        volumes.forEach(volume => {
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

    htmlAnchor = function (volume) {
        return `<a name="v${volume.id} />`;   
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
    
    htmlElement = function (tagName, content) {
        return `<${tagName}>${content}</${tagName}>`
    };
    
    htmlLink = function (parameters) {
        let classString = "";
        let contentString = "";
        let hrefString = "";
        let idString = "";
    
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
    
        return `<a${idString}${classString}${hrefString}>${contentString}</a>`
    };
    
    htmlHashLink = function (hashArguments, content) {
        return `<a href="javascript:void(0)" onclick="changeHash(${hashArguments})">${content}</a>`
    };

    init = function (callback) {
        let booksLoaded = false;
        let volumesLoaded = false;

        ajax('https://scriptures.byu.edu/mapscrip/model/books.php',
            data => {
                books = data;
                booksLoaded = true;

                if (volumesLoaded) {
                    cacheBooks(callback);
                }
            }
        );
        ajax('https://scriptures.byu.edu/mapscrip/model/volumes.php',
            data => {
                volumes = data;
                volumesLoaded = true;

                if (booksLoaded) {
                    cacheBooks(callback);
                }
            }
        );
    };

    navigateBook = function (bookId) {
        console.log('navigateBook ' + bookId);
    };

    navigateChapter = function (bookId, chapter) {
        console.log('navigateChapter ' + bookId + ', ' + chapter);
    };

    navigateHome = function (volumeId) {
        document.getElementById(DIV_SCRIPTURES).innerHTML = 
        "<div>Old Testament</div>" +
        "<div>New Testament</div>" +
        "<div>Book of Mormon</div>" +
        "<div>Doctrine and Covenants</div>" +
        "<div>Pearl of Great Price</div>" + volumeId;
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

    testGeoplaces = function () {
        const similar = function (number1, number2) {
            return Math.abs(number1 - number2 < 0.0000001);
        }

        const matchingELement = function (array, object) {
            let match = null;

            array.forEach(element => {
                if (similar(element.latitude, object.latitude) 
                && similar(element.longitude, object.longitude)) {
                    if (match === null) {
                        match = element;
                    }
                }
            });

            return match;
        };

        const makeUniqueGeoPlaces = function (geoPlaces) {
            const uniqueGeoPlaces = [];

            geoPlaces.forEach(geoPlace => {
                const matchedElement = matchingELement(uniqueGeoPlaces, geoPlace);

                if (!matchedElement) {
                    uniqueGeoPlaces.push(geoPlace);
                } else {
                    if (!matchedElement.name.toLowerCase().includes(geoPlace.name.toLowerCase())) {
                        matchedElement.name = matchedElement.name + ", " + geoPlace.name;
                    }
                }
            });

            console.log(uniqueGeoPlaces);

            return uniqueGeoPlaces;
        };

        makeUniqueGeoPlaces([
            { id: 536, name: "Hazor", latitude: 33.017181, longitude: 35.568048 },
            { id: 536, name: "Hazor", latitude: 33.017181, longitude: 35.568048 },
            { id: 536, name: "Hazor", latitude: 33.017181, longitude: 35.568048 },
            { id: 822, name: "Mount Halak", latitude: 30.916667, longitude: 34.833333 },
            { id: 1021, name: "Seir", latitude: 30.734691, longitude: 35.606250 },
            { id: 129, name: "Baal-gad", latitude: 33.416159, longitude: 35.857256 },
            { id: 1190, name: "Valley of Lebanon", latitude: 33.416519, longitude: 35.857256 },
            { id: 824, name: "Mount Hermon", latitude: 33.416159, longitude: 35.857256 },
        ]);
    };

    /*-------------------------------------------------------
     *                   PUBLIC API
     */
    return {
        init,
        testGeoplaces,
        onHashChanged
    };
}());