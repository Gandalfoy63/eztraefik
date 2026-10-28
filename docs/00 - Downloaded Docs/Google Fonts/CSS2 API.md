
#  CSS API update             

## Page Summary       
-  

Google Fonts v2 API now fully supports variable fonts.  
-  

The new API uses a different base URL and syntax for specifying font styles.  
-  

You can request multiple font families and specify axis ranges for variable fonts.  
-  

Optimize font requests by being precise about styles and using the `text=` parameter.  
-  

Use `@supports` queries to provide fallbacks for browsers without variable font support.     

  

Google Fonts now fully supports variable fonts in the v2 API update. We’ll explain how to call both single and multiple font families and how to specify axes ranges. For an in-depth look into variable fonts, learn more with this [interactively illustrated brochure](https://variablefonts.typenetwork.com) from David Berlow at TypeNetwork. 

## What’s new 

It all starts with a new base URL: 

```
https://fonts.googleapis.com/css2

```
 

The syntax for specifying styles within each family has changed to describe variable font ‘design spaces.’ 

## Quickstart guides 

Copy and paste this HTML into a file: 

```
<html>
  <head>
    <link rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Crimson+Pro">
    <style>
      body {
        font-family: 'Crimson Pro', serif;
        font-size: 48px;
      }
    </style>
  </head>
  <body>
    <div>Making the Web Beautiful!</div>
  </body>
</html>
```
 

Using a browser to open the file, the page should render the text, “Making the Web Beautiful”, in the Crimson Pro font. Making the Web Beautiful! 

### Multiple families 

To request multiple families, specify the `family=` param for each family. 

For example, to request the fonts [Crimson Pro](https://fonts.google.com/specimen/Crimson+Pro) and [Literata](https://fonts.google.com/specimen/Literata): 

```
https://fonts.googleapis.com/css2?family=Crimson+Pro&family=Literata

```
 

Copy and paste this HTML into a file: 

```
<html>
  <head>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Crimson+Pro&family=Literata">
    <style>
      body {
        font-size: 48px;
      }
      div:nth-child(1) {
        font-family: 'Crimson Pro', serif;
      }
      div:nth-child(2) {
        font-family: 'Literata’, serif;
      }
    </style>
  </head>
  <body>
    <div>Making the Web Beautiful!</div>
    <div>Making the Web Beautiful!</div>
  </body>
</html>
```
 

Using a browser to open the file, the page should render the text, “Making the Web Beautiful”, first in Crimson Pro then in Literata. Making the Web Beautiful! Making the Web Beautiful! 

## Axis ranges 

Variable fonts offer continuous ranges of styles, often without additional latency. This is relevant to [responsive design](https://developers.google.com/web/fundamentals/design-and-ux/responsive). This dynamic typography uses continuous ranges of styles, offering all the weights between 100 and 900 on a page, and responsively varying the weight based on some conditions. 

To request a range of a variable font axis, join the 2 values with `..`   
|  Font(s) |  Request |     
|  Crimson Pro [`wght 200-900`] |  `https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@200..900` |   
|  Crimson Pro Italic [`wght 200-900`] |  `https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@1,200..900` |   
|  Crimson Pro Bold Italic & [`wght 200-900`] |  `https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,200..900;1,700` |      Your browser does not appear to support variable fonts ([caniuse](https://caniuse.com/#feat=variable-fonts)). On a browser that does support font variations, the following text should render Crimson Pro as a smooth set of weights from 400 to 500. CSS animations can make the text smoothly vary the style on interaction.   If your browser fully supports variable fonts ([caniuse](https://caniuse.com/#feat=variable-fonts)), then the following text should render Crimson Pro as a smooth set of weights from 400 to 500. CSS animations can make the text smoothly vary the style on interaction.  Making the Web Beautiful! Making the Web Beautiful! Making the Web Beautiful! Making the Web Beautiful! Making the Web Beautiful! Making the Web Beautiful! 

### Individual styles, such as weight 

Without style specifications, the API provides the [default style](#default_style) of the requested family. To request other individual styles, such as specific weights, append a colon (:) after the name of the font family, followed by a list of axis property keywords in alphabetical order, an at sign (@), and one or more lists of values for those axis properties. 

These examples show this in action.   
|  Font(s) |  Request |     
|  Crimson Pro (default) |  `https://fonts.googleapis.com/css2?family=Crimson+Pro` |   
|  Crimson Pro Bold |  `https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@700` |   
|  Crimson Pro Regular & Bold |  `https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;700` |   
|  Crimson Pro Bold & Bold Italic |  `https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,700;1,700` |     

[Google Fonts](https://fonts.google.com) lists all the styles available for each font family. 

#### Default style 

When a request doesn’t specify a position or range for an axis, the default position will be used. The default position of the italic axis is 0 (normal) and the default for the weight axis is 400 (regular). 

For families with axes that don’t contain the default position, requests that do not specify positions for those axes will fail. For example, when requesting a family with a weight axis ranging from 500 to 900, the weight position must be specified. 

### Non-standard weights 

With static fonts, styles of weight are usually specified as multiples of 100 (e.g. 300, 400, 700). Variable fonts offer both the standard weights and intermediate weights. To render an intermediate weight: 

```
https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@450

```
  Your browser does not appear to support variable fonts ([caniuse](https://caniuse.com/#feat=variable-fonts)). On a browser that does support font variations, the following text should render Crimson Pro at visually distinct weights of 400, 450, and 500.   If your browser fully supports variable fonts ([caniuse](https://caniuse.com/#feat=variable-fonts)), the following text should render Crimson Pro at visually distinct weights of 400, 450, and 500.  Making the Web Beautiful! Making the Web Beautiful! Making the Web Beautiful! 

## Optimizing for latency and file size 

Be precise about the styles you are using. The API delivers the requested styles in the most compact set of fonts. Requesting unused styles may cause your users to download more font data than they need, causing more latency. If you use only 3 specific weights, specify them in your request as individual styles. If you use a continuous range of weights, specify that weight range in your request. 

### Use font-display 

The [font-display](https://www.w3.org/TR/css-fonts-4/#font-display-desc) property lets you control what happens while the font is still loading or otherwise unavailable. Specifying a value other than the default `auto` is usually appropriate. 

Pass the desired value in the `display` parameter: 

```
https://fonts.googleapis.com/css2?family=Crimson+Pro&display=swap

```
 

### Optimizing your font requests 

Oftentimes, when you want to use a web font on your site or application, you know in advance which letters you'll need. This often occurs when you're using a web font in a logo or heading. 

In these cases, you should consider specifying a `text=` value in your font request URL. This allows Google Fonts to return a font file that's optimized for your request. In some cases, this can reduce the size of the font file by up to 90%. 

To use this feature, simply add `text=` to your API request. For example, if you're only using Inconsolata for the title of your blog, you can put the title itself as the value of `text=`. Here’s what the request would look like: 

```
https://fonts.googleapis.com/css2?family=Comfortaa&text=Hello

```
 

As with all query strings, you should URL-encode the value: 

```
https://fonts.googleapis.com/css2?family=Comfortaa&text=Hello%20World

```
 

This feature also works for international fonts, allowing you to specify UTF-8 characters. For example, ¡Hola! is represented as: 

```
https://fonts.googleapis.com/css2?family=Comfortaa&text=%c2%a1Hola!

```
 

Please note that the 'text=' parameter can only be specified once. It applies to all families in the request. Please use separate API requests if you need different text optimizations across multiple families. 

## Forming API URLs 

### Strictness 

As a general note, the updated CSS API is more strict about what requests are accepted than the original CSS API. 

General guidelines:  
- List axes alphabetically (`en-US` locale) 
- Axis value groups (i.e. tuples) need to be sorted numerically 
- Tuples can’t overlap or touch (e.g. `wght` 400..500 and 500..600)  

### API URL Specification 

`/css2?family=<spec>[&family=<spec>...][&text=<text>][&display=<display>]` 

`spec`: `<family_name>[:<axis_tag_list>@<axis_tuple_list>]` 

`family_name`: Name of the font family 

`axis_tag_list`: `<axis>[,<axis>...] // Sorted alphabetically (en-US locale)` 

`axis`: An axis tag, e.g. `ital`, `wdth`, `wght` 

`axis_tuple_list`: `<axis_tuple>[;<axis_tuple>...]` 

`axis_tuple`: `<value>[,<value>...] // Same length as axis_tag_list` 

`value`: `<range>` | `<float>` 

`range`: `<float>..<float>` 

`float`: A value within the range of the corresponding axis 

`text`: The text that will be displayed in the requested typeface 

`display`: `auto` | `block` | `swap` | `fallback` | `optional` 

### Legacy browser support 

Browsers without variable font support may not be able to display your design as intended. Check browsers’ variable font support on [caniuse](https://caniuse.com/#feat=variable-fonts). 

By practicing [progressive enhancement](https://en.wikipedia.org/wiki/Progressive_enhancement), you can avoid unexpected behavior in those older browsers. Use `@supports` queries in your CSS to gate variable font features. 

In this example, we'd like to use weight 450 of Markazi Text, but will have to fall back to either Regular (weight 400) or Medium (weight 500) when variable font features aren't supported: 

```
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Markazi+Text:wght@450" />

<style>
  * {
    font-family: 'Markazi Text';
    font-weight: 400;
  }

  @supports (font-variation-settings: "wght" 450) {
    * {
      font-family: 'Markazi Text';
      font-weight: 450;
    }
  }
</style>

```
 

The CSS request `Markazi+Text:wght@450` sends weight 450 to clients that support variable fonts and weights 400 and 500 to those that don’t. In general, the fallbacks around the range of your request will be available in legacy browsers.   
|  Axis |  Fallbacks |     
|  `ital` |  0, 1 |   
|  `wght` |  100, 200, 300, 400, 500, 600, 700, 800, 900 |     

These examples show what styles would be available on legacy browsers for a few different requests.   
|  Request |  Styles available on legacy browsers |     
|  `ital@0` |  `ital@0` |   
|  `wght@500` |  `wght@500` |   
|  `wght@432` |  `wght@400;500` |   
|  `wght@440..560` |  `wght@400;500;600` |     

## Available variable fonts 

A table of the variable fonts available in the v2 API can be found [here](https://fonts.google.com/variablefonts). 

## Further reading  
- See a complete list of font families provided by the Google Fonts API on [Google Fonts](https://fonts.google.com/). 
- Learn more about how the Google Fonts API works on the [Technical Considerations](https://developers.google.com/fonts/docs/technical_considerations) page.
