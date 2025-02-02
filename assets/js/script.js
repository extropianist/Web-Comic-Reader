$(document).ready(function(){

	// tab switch
	$(document).on('click', '#tab', function() {
		// reset all
		$('#output').hide();
		$('.tab-button').removeClass('active');
		$('.option').hide();

		// set active
		var currentID = $(this).attr('tab');
		$(this).addClass('active');
		$('#'+currentID).show();
	});

	// current year
	$('#currYear').html((new Date()).getFullYear());

	// Load all the archive formats
	loadArchiveFormats(['rar', 'zip', 'tar']);

	// ----- OPEN COMIC FROM COMPUTER -----
	let dropzone = new Dropzone("div#dropzone", {
		url: '#', // Dummy URL, not used since you're not uploading files
		dictDefaultMessage: 'Click or Drop files here to upload <br> <i>(cbr,cbz,cbt files only)</i>',
		autoProcessQueue: false, // Disable automatic uploads
		disablePreviews: false,
		createImageThumbnails: false,
		acceptedFiles: '.cbr,.cbz,.cbt',
		maxFiles: 1,
		maxfilesexceeded: function(file) {
			this.removeAllFiles();
		},
		init: function () {
			this.on('addedfile', function (file) {
				// Handle the dropped file here
				openComic(file);
			});
		}
	});

	// ----- OPEN COMIC FROM INTERNAL FILE IN SERVER -----
	$(document).on('click', '.readNow', function() {
		// get the comic file name
		var comictitle = $(this).attr('comic_title');

		// disable loading other comic while loading
		toggleReadNow();

		var blob = null;
		var xhr = new XMLHttpRequest();
		xhr.open("GET", "./comics/"+comictitle); // make sure to put all the comics inside "comics" directory in the root directory
		xhr.responseType = "blob";
		xhr.onload = function()
		{
			blob = xhr.response;
				var file = new File([blob], comictitle);
				// open the comic
				openComic(file);
		}
		xhr.send();
	});

	function toggleReadNow(disable = true) {
		$('.readNow').prop('disabled', disable);
	}

	function openComic(file)
	{
			$('#output').hide();

			// init the gallery plugin, when there is a first click on a image
			// re-bind this function when opening new comic
			$(document).one('click','#comicImg',function(){
				event.preventDefault();
				// initialize gallery
				$('#output').lightGallery({
					selector: 'a',
					zoom: true,
					fullScreen: true,
					download: false,
					enableTouch: true,
				});
				$(this).click();
			});

			// Update progress text
			$('.progress-text').html("Reading 0/0 pages");

			// show loading
			$('.se-pre-con').fadeIn('slow');

			// destroy lightGallery
			var $lg = $('#output');
			$lg.lightGallery();
			$lg.data('lightGallery').destroy(true);

			// clear previous blobs
			clearBlobs();

			// clear previous output data
			$('#output').empty();

			// Open the file as an archive
			archiveOpenFile(file, function(archive, err) {
				if (archive)
				{
					$('#output').html("<b>"+archive.file_name+"</b><br><i>Click on the image to enlarge</i><br><br>");
					readContents(archive);
				}
				else
				{
					$('#output').html("<font color='red'>"+err+"</font><br>");

					// hide loading
					$('.se-pre-con').fadeOut('slow');

					// show output box
					$('#output').fadeIn('slow');
					
					// re-enable read now
					toggleReadNow(false);
				}
			});
	}

	// Function to read the contents of the archive
	async function readContents(archive) {
		var entries = archive.entries;

		// Create an array to hold the promises
		var promises = [];

		// Loop through all the contents
		for (var i = 0; i < entries.length; i++) {
			var filename = entries[i].name;
			// Check if it's an output file and not a folder
			if (getExt(filename) !== '') {
				// Push the promise to the array
				promises.push(createBlobAsync(entries[i], i, entries.length));
			}
		}

		// Wait for all promises to resolve
		await Promise.all(promises);
	}

	// function to convert the archive contents into blobs asynchronously, and return URL
	function createBlobAsync(entry, i, max) {
		return new Promise((resolve) => {
			entry.readData(function(data, err) {
				var blob = new Blob([data], { type: getMIME(entry.name) });
				var url = URL.createObjectURL(blob);

				$('#output').append("<a href='" + url + "' id='comicImg'><img src='" + url + "' class='imgUrl'/></a>");

				$('.progress-text').html("Reading " + (i + 1) + "/" + max + " pages");

				if (i === max - 1) {
					$('.progress-text').html("<font color='lime'>Completed!</font>");
					$('.se-pre-con').fadeOut('slow'); // hide loading
					$('#output').fadeIn('slow'); // show output box
					toggleReadNow(false); // re-enable read now
				}

				resolve(); // Resolve the promise
			});
		});
	}

    // function to return file extension based on file name
    function getExt(filename)
    {
        var ext = filename.split('.').pop();
        return (ext == filename) ? '' : ext;
    }

    // function to return MIME type based on the file extension
    // NOTE: THIS FUNCTION IS NOT EFFICIENT
    function getMIME(filename) 
	{
		var ext = getExt(filename).toLowerCase();

		var mimeTypes = {
			'jpg': 'image/jpeg',
			'jpeg': 'image/jpeg',
			'png': 'image/png',
			'gif': 'image/gif',
			'bmp': 'image/bmp',
			'webp': 'image/webp'
		};

		return mimeTypes[ext] || 'image/jpeg'; // Default to JPEG if extension is not recognized
	}

    // function to clear all previous blobs, free up memory
    function clearBlobs()
    {
        $('.imgUrl').each(function(){
            URL.revokeObjectURL($(this).attr('src'));
        });
    }

});
