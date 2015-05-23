<!doctype html>
<html>
    <head>
        <meta charset="utf-8">
        <title>HTML5 Audio Sequencer</title>
        <style type="text/css">
            @import url('css/styles.css');
        </style>

        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">

        <script src="js/jquery.min.js"></script>
        <script src="js/audio.js"></script>
    </head>

    <body>
        <!-- Loading screen -->
        <div class="load"></div>

        <!-- Page content -->
        <main>
            <div class="sequencer">
                <div class="content">
                    <!-- Top toolbar -->
                    <div class="ui-bar"></div>
                    <div class="ui-dropdowns"></div>

                    <!-- Piano player (toggleable) -->
                    <div class="piano"></div>

                    <!-- Music roll -->
                    <div class="music"></div>
                </div>
            </div>
        </main>

        <!-- Additional scripts -->
        <script src="js/main.js"></script>
    </body>
</html>