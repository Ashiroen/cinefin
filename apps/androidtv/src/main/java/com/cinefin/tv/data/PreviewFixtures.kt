package com.cinefin.tv.data

import com.cinefin.tv.core.CatalogItem
import com.cinefin.tv.core.HomeModel
import com.cinefin.tv.core.LibraryRow
import com.cinefin.tv.core.MediaStreamLite
import com.cinefin.tv.core.PersonLite
import com.cinefin.tv.core.PublicServer
import com.cinefin.tv.core.PublicUser
import com.cinefin.tv.core.SeasonLite
import com.cinefin.tv.core.UserDataLite
import com.cinefin.tv.core.TICKS_PER_SECOND

val fixtureServers = listOf(
    PublicServer("home", "Home server", "http://192.168.1.20:8096", "12.1.1", true),
    PublicServer("nas", "Media NAS", "http://192.168.1.45:8096", "10.10.10", false),
)

val fixtureUsers = listOf(
    PublicUser("v", "Vojtěch"),
    PublicUser("a", "Anna"),
    PublicUser("k", "Kids"),
    PublicUser("g", "Guest"),
)

const val fixtureQcCode = "K7Q2MX"

private fun movie(id: String, name: String, extra: CatalogItem.() -> CatalogItem = { this }): CatalogItem {
    val base = CatalogItem(
        id = id,
        name = name,
        type = "Movie",
        year = 2023,
        runtimeTicks = 114L * 60 * TICKS_PER_SECOND,
        officialRating = "R",
        genres = listOf("Thriller"),
        overview = "A cartographer crosses a frozen strait to find the line her father drew — and the town that vanished from every map after.",
    )
    return extra(base)
}

val longMeridian: CatalogItem = movie("meridian", "The Long Meridian") {
    copy(
        type = "Episode",
        year = 2024,
        officialRating = "PG-13",
        genres = listOf("Drama", "Mystery"),
        communityRating = 7.8,
        badges = listOf("Dolby Vision", "HDR10", "Dolby Atmos", "TrueHD 7.1"),
        seriesName = "The Long Meridian",
        seriesId = "meridian-show",
        seasonName = "Season 1",
        seasonId = "meridian-s1",
        parentIndexNumber = 1,
        indexNumber = 5,
        runtimeTicks = (2 * 3600 + 18 * 60) * TICKS_PER_SECOND,
        userData = UserDataLite(positionTicks = (1 * 3600 + 12 * 60 + 40) * TICKS_PER_SECOND),
        overview = "A cartographer crosses a frozen strait to find the line her father drew — and the town that vanished from every map after. Directed by Ines Varga.",
        people = fixtureCast,
        mediaStreams = listOf(
            MediaStreamLite(0, "Video", "hevc", videoRangeType = "HDR10", width = 3840, height = 2160, profile = "Main 10"),
            MediaStreamLite(1, "Audio", "truehd", "eng", "English · TrueHD Atmos 7.1", 8, isDefault = true),
            MediaStreamLite(2, "Audio", "dtshd", "eng", "English · DTS-HD MA 7.1", 8),
            MediaStreamLite(3, "Audio", "eac3", "eng", "English · Dolby Digital 5.1", 6),
            MediaStreamLite(4, "Audio", "aac", "cze", "Czech · AAC 5.1", 6),
            MediaStreamLite(5, "Audio", "aac", "eng", "Director commentary · AAC 2.0", 2),
            MediaStreamLite(6, "Subtitle", "srt", "eng", "English"),
            MediaStreamLite(7, "Subtitle", "pgs", "eng", "English (PGS)"),
        ),
    )
}

val glassValley: CatalogItem = movie("glass", "Glass Valley") {
    copy(badges = listOf("4K", "HDR10", "DTS:X"))
}

val homeFixture = HomeModel(
    resume = listOf(
        longMeridian,
        movie("harbour", "Harbour Lights"),
        movie("copper", "Copper Saints"),
        movie("quiet", "Quiet Orbit"),
        movie("salt", "Saltwind"),
    ),
    nextUp = listOf(
        movie("copper2", "Copper Saints"),
        movie("harbour2", "Harbour Lights"),
        movie("north", "North of Nowhere"),
        movie("paper", "Paper Tigers"),
        movie("quiet2", "Quiet Orbit"),
    ),
    libraries = listOf(
        LibraryRow(
            "movies",
            "Movies",
            listOf(
                glassValley,
                movie("salt2", "Saltwind"),
                movie("ember", "The Ember Choir"),
                movie("low", "Low Tide"),
                movie("nb", "Northbound"),
                movie("pale", "Pale Harbour"),
                movie("orchard", "Orchard"),
                movie("iron", "Iron Lantern"),
                movie("static", "Static"),
            ),
        ),
    ),
)

val fixtureCast = listOf(
    PersonLite("Mara Lindqvist", "Ada"),
    PersonLite("Tomas Reyes", "Elias"),
    PersonLite("June Okafor", "Petra"),
    PersonLite("Viktor Hale", "The Ferryman"),
    PersonLite("Ines Varga", "Director"),
    PersonLite("Leon Brandt", "Writer"),
)

val fixtureSeasons = listOf(
    SeasonLite("meridian-s1", "Season 1", 1, 8),
    SeasonLite("meridian-s2", "Season 2", 2, 8),
)
