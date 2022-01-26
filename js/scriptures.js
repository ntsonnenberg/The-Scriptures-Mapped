/*========================================================
 * FILE: scriptures.js
 * AUTHOR: Nathan Sonnenberg
 * DATE: Winter 2022
 * 
 * DESCRIPTION: Front-end JavaScript code for The Scriptures, Mapped.
 *              IS 542, Winter 2022, BYU.
 */

const Scriptures = (function () {
    "use strict";

    /*-------------------------------------------------------
     *                   CONSTANTS
     */

     /*-------------------------------------------------------
     *                   PRIVATE VARIABLES
     */
    let books;
    let volumes;

    /*-------------------------------------------------------
     *                   PRIVATE METHOD DECLARATIONS
     */
    let ajax;
    let cacheBooks;
    let init;
    let testGeoplaces;

     /*-------------------------------------------------------
     *                   PRIVATE METHODS
     */
    ajax = function (url, successCallback, failureCallback) {
        let request = new XMLHttpRequest();
        request.open('GET', url, true);

        request.onload = function() {
            if (this.status >= 200 && this.status < 400) {
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
        init: init,
        testGeoplaces: testGeoplaces
    };
}());