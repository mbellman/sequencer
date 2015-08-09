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
        <script src="js/ease.js"></script>
        <script src="js/audio.js"></script>
        <script src="js/file.js"></script>
        <script src="js/canvas.js"></script>
    </head>

    <body>
        <!-- Loading screen -->
        <div class="load"></div>

        <!-- Page content -->
        <main>

            <!-- Main sequencer interface -->
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

                        <div class="measure-grid"></div>
                        <div class="measure-labels"></div>
                    </div>

                    <!-- Extended view (toggleable) -->
                    <div class="extended">
                        <canvas class="view"></canvas>
                        <canvas class="cover"></canvas>

                        <div class="mini-playbar"></div>
                        <div class="mini-playback-bar"></div>
                        <div class="mini-frame"></div>

                        <div class="scroll left">
                            <div class="arrow"></div>
                        </div>

                        <div class="scroll right">
                            <div class="arrow"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Animation visualizer -->
            <div class="overlay">
                <div class="animation">
                    <div class="options">

                    </div>

                    <canvas class="visualizer"></canvas>
                </div>
            </div>

            <!-- Save/Open components (hidden) -->
            <a download="sequence.txt" id="save-link"></a>
            <input id="open-link" type="file" />

        </main>

        <!-- Additional scripts -->
        <script src="js/visualizer.js"></script>
        <script src="js/main.js"></script>
    </body>
</html>