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
        <script src="js/jquery.mousewheel.min.js"></script>
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
                    <div class="music">
                        <div class="select-bar"></div>  <!-- Visible only in selection mode -->
                        <div class="play-bar"></div>    <!-- Indicator for start of playback (scrolls with view) -->
                    </div>

                    <!-- Extended view (toggleable) -->
                    <div class="extended">
                        <canvas class="view"></canvas>
                        <canvas class="cover"></canvas>

                        <div class="mini-playbar"></div>
                        <div class="mini-frame"></div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Additional scripts -->
        <script src="js/main.js"></script>
    </body>
</html>