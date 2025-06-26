$(document).ready(function () {
    let isOpen = false;

    $(".dropdown-toggle").on("click", function (e) {
        e.preventDefault(); // ndalon Bootstrap default behavior
        const dropdownMenu = $(this).next(".dropdown-menu");

        if (!isOpen) {
            dropdownMenu.stop(true, true).slideDown(300);
            isOpen = true;
        } else {
            dropdownMenu.stop(true, true).slideUp(300);
            isOpen = false;
        }
    });

    // Mbyll dropdown në klikim jashtë
    $(document).on("click", function (e) {
        if (!$(e.target).closest(".dropdown").length) {
            $(".dropdown-menu").slideUp(200);
            isOpen = false;
        }
    });
});
