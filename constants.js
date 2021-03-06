/**
 * Default game width.
 * @const
 */
var DEFAULT_WIDTH = 600;

/**
 * Frames per second.
 * @const
 */
var FPS = 60;

/** @const */
//var IS_HIDPI = window.devicePixelRatio > 1;
var IS_HIDPI = false;
/** @const */
var IS_IOS = /iPad|iPhone|iPod/.test(window.navigator.platform);

/** @const */
var IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;

/** @const */
var IS_TOUCH_ENABLED = 'ontouchstart' in window;

var backgrounds = ["background-1","background-1","background-2","background-2", "background-3", "background-3", "background-4", "background-4"];

var sprites = ["inseong-resources-1x-0","inseong-resources-1x-1", "inseong-resources-1x-1", "inseong-resources-1x-2", "inseong-resources-1x-2", "inseong-resources-1x-3", "inseong-resources-1x-3", "inseong-resources-1x-4", "inseong-resources-1x-4"];

var goal = 93712;

var memberGap = 80;

var releaseDate = Date.parse('2020-07-12T00:00:00+09:00');

var BACKGROUNDNUM = 0;